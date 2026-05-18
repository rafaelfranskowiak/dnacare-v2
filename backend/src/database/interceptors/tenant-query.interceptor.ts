import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantQueryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (request.method === 'GET') {
      const originalQuery = request.query || {};
      if (tenantId && !originalQuery.tenant_id) {
        request.query = { ...originalQuery, tenant_id: tenantId };
      }
    }

    return next.handle();
  }
}

export function applyTenantFilter(
  qb: any,
  tenantId: string,
  alias: string,
): any {
  return qb.andWhere(`${alias}.tenant_id = :tenantId`, { tenantId });
}
