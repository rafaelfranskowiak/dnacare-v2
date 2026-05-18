import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantQueryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const tenantId = req.tenantId;

    if (tenantId && req.method === 'GET' && !req.query.tenantId) {
      req.query.tenantId = tenantId;
    }

    return next.handle();
  }
}
