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
import { AsaasTenantContext } from '../asaas/asaas.service';

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

  async handleEvent(
    tenantId: string,
    eventId: string,
    eventType: string,
    payload: Record<string, any>,
    asaasContext: AsaasTenantContext,
  ): Promise<void> {
    const { inserted, event } = await this.webhookEventService.insertIfNotExists(
      tenantId,
      eventId,
      eventType,
      payload,
    );

    if (!inserted && ['processed', 'processing'].includes(event.status)) {
      this.logger.log(`Webhook duplicado ignorado: ${eventId} (${eventType})`);
      return;
    }

    await this.webhookEventService.markProcessing(event.id);

    try {
      switch (eventType) {
        case 'PAYMENT_CONFIRMED':
          await this.handlePaymentConfirmed(tenantId, payload, asaasContext);
          break;
        case 'PAYMENT_RECEIVED':
          await this.handlePaymentReceived(payload);
          break;
        case 'PAYMENT_OVERDUE':
          await this.handlePaymentOverdue(tenantId, payload);
          break;
        case 'PAYMENT_DELETED':
          await this.handlePaymentDeleted(tenantId, payload);
          break;
        case 'PAYMENT_REFUNDED':
          await this.handlePaymentRefunded(tenantId, payload);
          break;
        case 'SUBSCRIPTION_INACTIVATED':
        case 'SUBSCRIPTION_DELETED':
          await this.handleSubscriptionInactivated(tenantId, payload);
          break;
        default:
          this.logger.debug(`Evento Asaas sem handler específico: ${eventType}`);
      }

      await this.webhookEventService.markProcessed(event.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.webhookEventService.markFailed(event.id, message);
      this.logger.error(`Falha ao processar webhook ${eventType}: ${message}`);
      throw err;
    }
  }

  private async handlePaymentConfirmed(
    tenantId: string,
    payload: Record<string, any>,
    asaasContext: AsaasTenantContext,
  ): Promise<void> {
    const payment = payload.payment;
    if (!payment?.id) {
      throw new Error('PAYMENT_CONFIRMED sem payment.id');
    }

    const asaasPaymentId = String(payment.id);
    const asaasCustomerId = String(payment.customer || '');

    const sale = await this.saleService.findByAsaasPaymentId(
      asaasPaymentId,
      tenantId,
    );
    if (!sale) {
      throw new Error(`Venda não encontrada para o pagamento ${asaasPaymentId}`);
    }

    await this.saleService.confirmSale(sale.id, tenantId);

    const opportunity = await this.opportunityService.findById(
      sale.opportunityId,
      tenantId,
    );
    if (!opportunity) {
      throw new Error(`Oportunidade não encontrada para a venda ${sale.id}`);
    }

    await this.opportunityService.convert(opportunity.id, tenantId);

    const holder = await this.clientService.createFromOpportunity(
      tenantId,
      opportunity,
      opportunity.sellerId,
      asaasCustomerId || sale.asaasCustomerId,
    );

    const dependents = await this.opportunityService.getDependents(
      opportunity.id,
      tenantId,
    );

    for (const dep of dependents) {
      const registry = await this.documentRegistry.checkExists(
        tenantId,
        dep.documentNormalized,
      );

      if (!registry) {
        await this.documentRegistry.register(
          tenantId,
          dep.documentNormalized,
          'client',
          dep.id,
        );
      }

      await this.clientService.createDependentFromOpportunity(
        tenantId,
        opportunity.id,
        holder.id,
        opportunity.sellerId,
        {
          name: dep.name,
          document: dep.document,
          documentNormalized: dep.documentNormalized,
        },
      );
    }

    await this.subscriptionService.createFromSale(
      tenantId,
      holder.id,
      sale,
      asaasContext,
      payment.dueDate,
      payment.paymentDate || payment.clientPaymentDate,
    );

    this.logger.log(`Pagamento confirmado: venda ${sale.id}, titular ${holder.id}`);
  }

  private async handlePaymentReceived(payload: Record<string, any>): Promise<void> {
    const payment = payload.payment;
    if (!payment?.id) {
      throw new Error('PAYMENT_RECEIVED sem payment.id');
    }

    // O MVP ainda não possui um ledger local de recebimentos. Este evento
    // não repete a conversão já disparada por PAYMENT_CONFIRMED.
    this.logger.log(`Pagamento recebido no Asaas: ${payment.id}`);
  }

  private async handlePaymentOverdue(
    tenantId: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const payment = payload.payment;
    if (!payment?.subscription) return;

    await this.subscriptionService.setStatusByAsaasId(
      payment.subscription,
      tenantId,
      'inadimplente',
    );
  }

  private async handlePaymentDeleted(
    tenantId: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const payment = payload.payment;
    if (!payment?.id) return;

    const sale = await this.saleService.findByAsaasPaymentId(payment.id, tenantId);
    if (sale?.status === 'pending_payment') {
      await this.saleRepo.update(
        { id: sale.id, tenantId },
        { status: 'failed' },
      );
    }
  }

  private async handlePaymentRefunded(
    tenantId: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const payment = payload.payment;
    if (!payment?.id) return;

    await this.saleRepo.update(
      { asaasPaymentId: payment.id, tenantId },
      { status: 'refunded' },
    );
  }

  private async handleSubscriptionInactivated(
    tenantId: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const subscription = payload.subscription;
    if (!subscription?.id) return;

    await this.subscriptionService.setStatusByAsaasId(
      subscription.id,
      tenantId,
      'inativa',
    );
  }
}
