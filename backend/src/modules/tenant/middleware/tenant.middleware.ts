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

    // Try JWT token first (Bearer) — extract tenantId from payload
    const authHeader = req.headers['authorization'] as string | undefined;
    let jwtTenantId: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        jwtTenantId = payload.tenantId;
      } catch {
        // Ignore parse errors — fall through to header check
      }
    }

    // Try x-tenant-id header
    const header = req.headers['x-tenant-id'] as string | undefined;
    const lookupValue = header || jwtTenantId;

    if (!lookupValue) throw new UnauthorizedException('x-tenant-id header required');

    let tenant = await this.tenantService.findBySlug(lookupValue);
    if (!tenant) {
      tenant = await this.tenantService.findById(lookupValue);
    }
    if (!tenant) throw new UnauthorizedException('Tenant not found');

    (req as any).tenantId = tenant.id;
    next();
  }
}
