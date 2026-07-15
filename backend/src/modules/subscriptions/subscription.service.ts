import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../subscriptions/subscription.entity';
import { AsaasService, AsaasTenantContext } from '../asaas/asaas.service';

type AsaasCycle =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUALLY'
  | 'YEARLY';

const VALID_CYCLES = new Set<AsaasCycle>([
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'BIMONTHLY',
  'QUARTERLY',
  'SEMIANNUALLY',
  'YEARLY',
]);

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly asaasService: AsaasService,
  ) {}

  private normalizeCycle(value?: string): AsaasCycle {
    const cycle = String(value || 'MONTHLY').toUpperCase() as AsaasCycle;
    if (!VALID_CYCLES.has(cycle)) {
      throw new BadRequestException(`Ciclo de cobrança não suportado: ${value}`);
    }
    return cycle;
  }

  private addCycle(dateInput: string, cycle: AsaasCycle): string {
    const date = new Date(`${dateInput.slice(0, 10)}T12:00:00.000Z`);

    if (cycle === 'WEEKLY') {
      date.setUTCDate(date.getUTCDate() + 7);
    } else if (cycle === 'BIWEEKLY') {
      date.setUTCDate(date.getUTCDate() + 14);
    } else {
      const monthsByCycle: Record<Exclude<AsaasCycle, 'WEEKLY' | 'BIWEEKLY'>, number> = {
        MONTHLY: 1,
        BIMONTHLY: 2,
        QUARTERLY: 3,
        SEMIANNUALLY: 6,
        YEARLY: 12,
      };
      const originalDay = date.getUTCDate();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + monthsByCycle[cycle]);
      const lastDayOfTargetMonth = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12),
      ).getUTCDate();
      date.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
    }

    return date.toISOString().slice(0, 10);
  }

  private calculateReactivationDueDate(subscription: Subscription): string {
    const today = new Date().toISOString().slice(0, 10);
    const savedNextDueDate = subscription.nextDueDate?.slice(0, 10);

    if (savedNextDueDate && savedNextDueDate > today) {
      return savedNextDueDate;
    }

    const cycle = this.normalizeCycle(subscription.billingCycle);
    return this.addCycle(today, cycle);
  }

  async createFromSale(
    tenantId: string,
    clientId: string,
    sale: any,
    asaasContext: AsaasTenantContext,
    paidDueDate?: string,
    paymentDate?: string,
  ): Promise<Subscription> {
    const existing = await this.findBySale(sale.id, tenantId);
    if (existing) {
      return existing;
    }

    const startDate = (paymentDate || new Date().toISOString()).slice(0, 10);
    const cycle = this.normalizeCycle(sale.planSnapshot?.billingCycle);
    const nextDueDate = this.addCycle(
      (paidDueDate || startDate).slice(0, 10),
      cycle,
    );
    const recurringValue = Math.max(
      0,
      Number(sale.baseValue || 0)
        + Number(sale.dependentsValue || 0)
        - Number(sale.discount || 0),
    );

    if (recurringValue <= 0) {
      throw new BadRequestException('Valor recorrente da assinatura é inválido');
    }

    const asaasSub = await this.asaasService.createSubscription(
      {
        customerId: sale.asaasCustomerId,
        billingType: 'BOLETO',
        value: recurringValue,
        nextDueDate,
        cycle,
        description: sale.planSnapshot?.planName || 'Assinatura',
        externalReference: sale.id,
      },
      asaasContext,
    );

    const sub = this.subRepo.create({
      tenantId,
      clientId,
      saleId: sale.id,
      planId: sale.planId,
      planVersionId: sale.planVersionId,
      planName: sale.planSnapshot?.planName || '',
      recurringValue,
      dependentRule: sale.planSnapshot?.dependentRule || 'none',
      dependentCount: sale.dependentCount || 0,
      status: 'ativa',
      startDate,
      billingCycle: cycle,
      nextDueDate,
      asaasSubscriptionId: asaasSub.id,
    });

    return this.subRepo.save(sub);
  }

  async suspend(
    subscription: Subscription,
    context: AsaasTenantContext,
  ): Promise<Subscription> {
    if (!subscription.asaasSubscriptionId) {
      throw new BadRequestException('Assinatura sem vínculo com o Asaas');
    }

    await this.asaasService.updateSubscription(
      subscription.asaasSubscriptionId,
      { status: 'INACTIVE' },
      context,
    );

    subscription.status = 'inativa';
    return this.subRepo.save(subscription);
  }

  async reactivate(
    subscription: Subscription,
    context: AsaasTenantContext,
  ): Promise<Subscription> {
    if (!subscription.asaasSubscriptionId) {
      throw new BadRequestException('Assinatura sem vínculo com o Asaas');
    }

    const nextDueDate = this.calculateReactivationDueDate(subscription);

    await this.asaasService.updateSubscription(
      subscription.asaasSubscriptionId,
      {
        status: 'ACTIVE',
        nextDueDate,
      },
      context,
    );

    subscription.status = 'ativa';
    subscription.nextDueDate = nextDueDate;
    return this.subRepo.save(subscription);
  }

  async findByClient(clientId: string, tenantId: string): Promise<Subscription | null> {
    return this.subRepo.findOne({ where: { clientId, tenantId } });
  }

  async findBySale(saleId: string, tenantId: string): Promise<Subscription | null> {
    return this.subRepo.findOne({ where: { saleId, tenantId } });
  }

  async setStatus(id: string, tenantId: string, status: string): Promise<void> {
    await this.subRepo.update({ id, tenantId }, { status });
  }

  async setStatusByAsaasId(
    asaasSubscriptionId: string,
    tenantId: string,
    status: string,
  ): Promise<void> {
    await this.subRepo.update({ asaasSubscriptionId, tenantId }, { status });
  }
}
