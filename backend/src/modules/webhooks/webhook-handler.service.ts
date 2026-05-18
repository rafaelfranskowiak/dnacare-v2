import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../sales/sale.entity';
import { WebhookEventService } from './webhook-events.service';
import { SaleService } from '../sales/sale.service';
import { OpportunityService } from '../opportunities/opportunity.service';
import { ClientService } from '../clients/client.service';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { DocumentRegistryService } from '../opportunities/document-registry.service';

@Injectable()
export class WebhookHandlerService {
  private readonly logger = new Logger(WebhookHandlerService.name);

  constructor(
    private readonly webhookEventService: WebhookEventService,
    private readonly saleService: SaleService,
    private readonly opportunityService: OpportunityService,
    private readonly clientService: ClientService,
    private readonly subscriptionService: SubscriptionService,
    private readonly documentRegistry: DocumentRegistryService,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
  ) {}

  async handleEvent(tenantId: string, eventId: string, eventType: string, payload: Record<string, any>): Promise<void> {
    const { inserted } = await this.webhookEventService.insertIfNotExists(tenantId, eventId, eventType, payload);
    if (!inserted) {
      this.logger.log(`Duplicate webhook ignored: ${eventId} (${eventType})`);
      return;
    }

    try {
      switch (eventType) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
          await this.handlePaymentConfirmed(tenantId, payload);
          break;
        case 'PAYMENT_OVERDUE':
          await this.handlePaymentOverdue(payload);
          break;
        case 'PAYMENT_DELETED':
          await this.handlePaymentDeleted(tenantId, payload);
          break;
        case 'PAYMENT_REFUNDED':
          await this.handlePaymentRefunded(tenantId, payload);
          break;
        case 'SUBSCRIPTION_INACTIVATED':
        case 'SUBSCRIPTION_DELETED':
          await this.handleSubscriptionInactivated(payload);
          break;
      }
    } catch (err) {
      this.logger.error(`Webhook processing error: ${eventType}`, err);
    }
  }

  private async handlePaymentConfirmed(tenantId: string, payload: Record<string, any>): Promise<void> {
    const payment = payload.payment;
    if (!payment) return;

    const asaasPaymentId = payment.id;
    const asaasCustomerId = payment.customer;

    const sale = await this.saleService.findByAsaasPaymentId(asaasPaymentId);
    if (!sale) { this.logger.warn(`Sale not found for payment: ${asaasPaymentId}`); return; }

    await this.saleService.confirmSale(sale.id, tenantId);

    const opportunity = await this.opportunityService.findById(sale.opportunityId, tenantId);
    if (!opportunity) return;

    await this.opportunityService.convert(opportunity.id, tenantId);

    const holder = await this.clientService.createFromOpportunity(tenantId, opportunity, opportunity.sellerId, asaasCustomerId);

    const dependents = await this.opportunityService.getDependents(opportunity.id);
    for (const dep of dependents) {
      try { await this.documentRegistry.register(tenantId, dep.documentNormalized, 'client', dep.id); } catch {}
      await this.clientService.createDependentFromOpportunity(tenantId, opportunity.id, holder.id, opportunity.sellerId, { name: dep.name, document: dep.document, documentNormalized: dep.documentNormalized });
    }

    await this.subscriptionService.createFromSale(tenantId, holder.id, sale);
    this.logger.log(`Payment confirmed: sale ${sale.id}, holder ${holder.id}`);
  }

  private async handlePaymentOverdue(payload: Record<string, any>): Promise<void> {
    const payment = payload.payment;
    if (!payment?.subscription) return;
    await this.subscriptionService.setStatusByAsaasId(payment.subscription, 'inadimplente');
  }

  private async handlePaymentDeleted(tenantId: string, payload: Record<string, any>): Promise<void> {
    const payment = payload.payment;
    if (!payment) return;
    const sale = await this.saleService.findByAsaasPaymentId(payment.id);
    if (sale && sale.status === 'pending_payment') {
      await this.saleRepo.update(sale.id, { status: 'failed' });
    }
  }

  private async handlePaymentRefunded(tenantId: string, payload: Record<string, any>): Promise<void> {
    const payment = payload.payment;
    if (!payment) return;
    await this.saleRepo.update({ asaasPaymentId: payment.id }, { status: 'refunded' });
  }

  private async handleSubscriptionInactivated(payload: Record<string, any>): Promise<void> {
    const sub = payload.subscription;
    if (!sub) return;
    await this.subscriptionService.setStatusByAsaasId(sub.id, 'inativa');
  }
}
