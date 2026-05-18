import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookEvent } from './webhook-event.entity';
import { Sale } from '../sales/sale.entity';
import { WebhookEventService } from './webhook-events.service';
import { WebhookHandlerService } from './webhook-handler.service';
import { WebhookController } from './webhook.controller';
import { SaleModule } from '../sales/sale.module';
import { OpportunityModule } from '../opportunities/opportunity.module';
import { ClientModule } from '../clients/client.module';
import { SubscriptionModule } from '../subscriptions/subscription.module';
import { TenantModule } from '../tenant/tenant.module';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEvent, Sale]),
    SaleModule,
    OpportunityModule,
    ClientModule,
    SubscriptionModule,
    TenantModule,
    AsaasModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookEventService, WebhookHandlerService],
  exports: [WebhookEventService],
})
export class WebhooksModule {}
