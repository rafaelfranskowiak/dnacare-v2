import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  private normalizePath(req: Request): string {
    const rawPath = req.originalUrl || req.url || req.path || '';
    const pathOnly = rawPath.split('?')[0];
    return pathOnly.replace(/^\/api(?=\/)/, '');
  }

  private isPublicPath(req: Request): boolean {
    const requestPath = this.normalizePath(req);

    if (
      requestPath === '/auth/login'
      || requestPath === '/auth/admin/login'
      || requestPath === '/tenants/public'
    ) {
      return true;
    }

    return req.method === 'POST'
      && /^\/webhooks\/asaas\/[^/]+$/.test(requestPath);
  }

  async use(req: Request, _res: Response, next: NextFunction) {
    if (this.isPublicPath(req)) {
      next();
      return;
    }

    // O middleware apenas identifica o tenant. A autenticidade do JWT é
    // validada pelo JwtAuthGuard nas rotas protegidas.
    const authHeader = req.headers.authorization;
    let jwtTenantId: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const encodedPayload = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
        jwtTenantId = payload.tenantId;
      } catch {
        // O JwtAuthGuard rejeitará tokens inválidos nas rotas protegidas.
      }
    }

    const headerTenantId = req.headers['x-tenant-id'];
    const lookupValue = (
      typeof headerTenantId === 'string' ? headerTenantId : jwtTenantId
    ) || jwtTenantId;

    if (!lookupValue) {
      throw new UnauthorizedException('x-tenant-id header required');
    }

    let tenant = await this.tenantService.findBySlug(lookupValue);
    if (!tenant) {
      tenant = await this.tenantService.findById(lookupValue);
    }
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    (req as any).tenantId = tenant.id;
    next();
  }
}
