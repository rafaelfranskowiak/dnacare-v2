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
    const targetTenantId = req.tenantId || req.headers['x-tenant-id'];

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

    return true;
  }
}
