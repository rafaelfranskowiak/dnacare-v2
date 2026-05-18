import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AsaasModule } from './modules/asaas/asaas.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PlanModule } from './modules/plans/plan.module';
import { OpportunityModule } from './modules/opportunities/opportunity.module';
import { SaleModule } from './modules/sales/sale.module';
import { ClientModule } from './modules/clients/client.module';
import { SubscriptionModule } from './modules/subscriptions/subscription.module';
import { ReportsModule } from './modules/reports/reports.module';
import databaseConfig from './config/database.config';
import s3Config from './config/s3.config';
import asaasConfig from './config/asaas.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig, s3Config, asaasConfig] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.getOrThrow('database'),
    }),
    TenantModule,
    UsersModule,
    AuthModule,
    AsaasModule,
    WebhooksModule,
    PlanModule,
    OpportunityModule,
    SaleModule,
    ClientModule,
    SubscriptionModule,
    ReportsModule,
  ],
})
export class AppModule {}
