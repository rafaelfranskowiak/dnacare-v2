import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  private readonly publicPaths = ['/auth/login', '/auth/admin/login', '/tenants/public'];

  async use(req: Request, _res: Response, next: NextFunction) {
    const requestPath = req.originalUrl || req.url || req.path || '';
    const isPublic = this.publicPaths.some((p) => requestPath.includes(p));
    if (isPublic) {
      next();
      return;
    }

    const header = req.headers['x-tenant-id'] as string | undefined;
    if (!header) throw new UnauthorizedException('x-tenant-id header required');

    let tenant = await this.tenantService.findBySlug(header);
    if (!tenant) {
      tenant = await this.tenantService.findById(header);
    }
    if (!tenant) throw new UnauthorizedException('Tenant not found');

    (req as any).tenantId = tenant.id;
    next();
  }
}
