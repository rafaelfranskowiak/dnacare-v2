import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantUserService } from '../tenant-user.service';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(
    private readonly tenantUserService: TenantUserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const targetTenantId = req.tenantId;

    if (!user || !targetTenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (user.is_platform_admin) {
      return true;
    }

    const link = await this.tenantUserService.findByUserAndTenant(
      user.id,
      targetTenantId,
    );

    if (!link) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    // O papel precisa refletir o tenant efetivamente selecionado na requisição.
    // Sem isso, um usuário administrador no tenant A poderia reaproveitar esse
    // papel ao acessar o tenant B, onde possui um papel mais restrito.
    req.user.tenantId = targetTenantId;
    req.user.role = link.role;

    return true;
  }
}
