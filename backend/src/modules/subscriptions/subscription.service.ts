import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../subscriptions/subscription.entity';
import { AsaasService } from '../asaas/asaas.service';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly asaasService: AsaasService,
  ) {}

  async createFromSale(tenantId: string, clientId: string, sale: any, tenantApiKey?: string): Promise<Subscription> {
    const startDate = new Date().toISOString().split('T')[0];

    const asaasSub = await this.asaasService.createSubscription({
      customerId: sale.asaasCustomerId,
      billingType: 'BOLETO',
      value: sale.totalValue || sale.recurringValue || 99.90,
      nextDueDate: startDate,
      cycle: 'MONTHLY',
      description: sale.planSnapshot?.planName || 'Assinatura',
      externalReference: sale.id,
    }, tenantApiKey);

    const sub = this.subRepo.create({
      tenantId,
      clientId,
      saleId: sale.id,
      planId: sale.planId,
      planVersionId: sale.planVersionId,
      planName: sale.planSnapshot?.planName || '',
      recurringValue: sale.totalValue || 0,
      dependentRule: sale.planSnapshot?.dependentRule || 'none',
      dependentCount: sale.dependentCount || 0,
      status: 'ativa',
      startDate,
      asaasSubscriptionId: asaasSub.id,
    });
    return this.subRepo.save(sub);
  }

  async findByClient(clientId: string, tenantId: string): Promise<Subscription | null> {
    return this.subRepo.findOne({ where: { clientId, tenantId } });
  }

  async setStatus(id: string, status: string): Promise<void> {
    await this.subRepo.update(id, { status });
  }

  async setStatusByAsaasId(asaasSubscriptionId: string, status: string): Promise<void> {
    await this.subRepo.update({ asaasSubscriptionId }, { status });
  }
}
