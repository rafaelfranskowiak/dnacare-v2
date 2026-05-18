import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantService } from './tenant.service';
import { Tenant } from './tenant.entity';
import { TenantUser } from './tenant-user.entity';
import { TenantUserService } from './tenant-user.service';
import { TenantUserController } from './tenant-user.controller';
import { TenantController } from './tenant.controller';
import { TenantAccessGuard } from './guards/tenant-access.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantUser])],
  controllers: [TenantUserController, TenantController],
  providers: [TenantService, TenantUserService, TenantAccessGuard],
  exports: [TenantService, TenantUserService, TenantAccessGuard],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
