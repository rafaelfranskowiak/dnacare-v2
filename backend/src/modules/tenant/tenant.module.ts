import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantService } from './tenant.service';
import { Tenant } from './tenant.entity';
import { TenantUser } from './tenant-user.entity';
import { TenantUserService } from './tenant-user.service';
import { TenantUserController } from './tenant-user.controller';
import { TenantController } from './tenant.controller';
import { Team } from './team.entity';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { TenantAccessGuard } from './guards/tenant-access.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantUser, Team])],
  controllers: [TenantUserController, TenantController, TeamController],
  providers: [TenantService, TenantUserService, TeamService, TenantAccessGuard],
  exports: [TenantService, TenantUserService, TeamService, TenantAccessGuard],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
