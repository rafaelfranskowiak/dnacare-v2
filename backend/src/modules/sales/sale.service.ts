import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from './sale.entity';
import { AsaasService, AsaasTenantContext } from '../asaas/asaas.service';
import { calculatePricing, PricingInput } from '../plans/pricing-engine';

const ALLOWED_SALE_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['confirmed', 'cancelled_before_payment', 'failed'],
  confirmed: ['refunded'],
  cancelled_before_payment: [],
  failed: [],
  refunded: [],
};

@Injectable()
export class SaleService {
  private readonly logger = new Logger(SaleService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    private readonly asaasService: AsaasService,
  ) {}

  async findAll(tenantId: string, filters: any): Promise<{ data: Sale[]; total: number }> {
    const qb = this.saleRepo.createQueryBuilder('s').where('s.tenant_id = :tenantId', { tenantId });
    if (filters.status) qb.andWhere('s.status = :status', { status: filters.status });
    if (filters.sellerId) qb.andWhere('s.seller_id = :sellerId', { sellerId: filters.sellerId });
    qb.orderBy('s.created_at', 'DESC');
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string, tenantId: string): Promise<Sale | null> {
    return this.saleRepo.findOne({ where: { id, tenantId } });
  }

  async generateCheckout(
    tenantId: string,
    opportunity: any,
    planVersion: any,
    paymentMethod: string,
    dependentCount: number,
    asaasContext: AsaasTenantContext,
  ): Promise<{ sale: Sale; checkoutUrl?: string; bankSlipUrl?: string }> {
    if (paymentMethod !== 'BOLETO') {
      throw new BadRequestException(
        'Cartão de crédito ainda não está disponível. Selecione boleto para concluir o MVP atual.',
      );
    }

    let sale = await this.findByOpportunity(opportunity.id, tenantId);

    if (sale?.asaasPaymentId) {
      return {
        sale,
        checkoutUrl: sale.asaasCheckoutUrl || undefined,
        bankSlipUrl: sale.asaasBankSlipUrl || undefined,
      };
    }

    if (sale && sale.status !== 'pending_payment') {
      throw new BadRequestException(
        `Já existe uma venda com status "${sale.status}" para esta oportunidade`,
      );
    }

    if (!sale) {
      const pricingInput: PricingInput = {
        baseValue: Number(planVersion.baseValue),
        dependentRule: planVersion.dependentRule,
        includedDependents: planVersion.includedDependents,
        dependentValue: Number(planVersion.dependentValue || 0),
        tiers: planVersion.tiersConfig || null,
        admissionFee: Number(planVersion.admissionFee || 0),
        discount: 0,
        dependentCount,
      };

      const pricing = calculatePricing(pricingInput);

      const customersResponse = await this.asaasService.findCustomerByCpfCnpj(
        opportunity.documentNormalized,
        asaasContext,
      );
      const customers = Array.isArray(customersResponse?.data)
        ? customersResponse.data
        : [];
      const existingCustomer = customers.find(
        (customer: any) => customer.externalReference === opportunity.id,
      ) || customers[0];

      const asaasCustomer = existingCustomer || await this.asaasService.createCustomer(
        {
          name: opportunity.name,
          cpfCnpj: opportunity.documentNormalized,
          email: opportunity.email,
          phone: opportunity.phone,
          mobilePhone: opportunity.phone,
          postalCode: opportunity.postalCode,
          address: opportunity.address,
          addressNumber: opportunity.addressNumber,
          province: opportunity.neighborhood,
          externalReference: opportunity.id,
        },
        asaasContext,
      );

      const planSnapshot = {
        planId: planVersion.planId,
        planVersionId: planVersion.id,
        planName: planVersion.name,
        billingCycle: planVersion.billingCycle,
        baseValue: planVersion.baseValue,
        dependentRule: planVersion.dependentRule,
        includedDependents: planVersion.includedDependents,
        dependentValue: planVersion.dependentValue,
        tiersConfig: planVersion.tiersConfig,
        admissionFee: planVersion.admissionFee,
      };

      const saleData: Partial<Sale> = {
        tenantId,
        opportunityId: opportunity.id,
        sellerId: opportunity.sellerId,
        planId: planVersion.planId,
        planVersionId: planVersion.id,
        planSnapshot,
        dependentCount,
        totalLives: 1 + dependentCount,
        baseValue: pricing.baseValue,
        dependentsValue: pricing.dependentsValue,
        admissionFee: pricing.admissionFee,
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        totalValue: pricing.total,
        calculationMemory: JSON.parse(pricing.calculationMemory),
        paymentMethod,
        status: 'pending_payment',
        asaasCustomerId: asaasCustomer.id,
      };

      sale = await this.saleRepo.save(this.saleRepo.create(saleData));
    }

    if (!sale.asaasCustomerId) {
      throw new BadRequestException('Venda sem cliente Asaas associado');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const payment = await this.asaasService.createPayment(
      {
        customerId: sale.asaasCustomerId,
        billingType: 'BOLETO',
        value: Number(sale.totalValue),
        dueDate: dueDateStr,
        description: String(sale.planSnapshot?.planName || 'Plano DNA Care'),
        externalReference: sale.id,
      },
      asaasContext,
    );

    sale.asaasPaymentId = payment.id;
    sale.asaasBankSlipUrl = payment.bankSlipUrl || payment.invoiceUrl || null;
    await this.saleRepo.save(sale);

    return { sale, bankSlipUrl: sale.asaasBankSlipUrl || undefined };
  }

  async confirmSale(id: string, tenantId: string): Promise<Sale> {
    const sale = await this.findById(id, tenantId);
    if (!sale) throw new NotFoundException('Venda não encontrada');

    if (sale.status === 'confirmed') {
      return sale;
    }

    if (!ALLOWED_SALE_TRANSITIONS[sale.status]?.includes('confirmed')) {
      throw new BadRequestException(`Não é possível confirmar venda com status "${sale.status}"`);
    }

    sale.status = 'confirmed';
    return this.saleRepo.save(sale);
  }

  async cancelBeforePayment(id: string, tenantId: string): Promise<Sale> {
    const sale = await this.findById(id, tenantId);
    if (!sale) throw new NotFoundException('Venda não encontrada');
    if (sale.status !== 'pending_payment') return sale;
    sale.status = 'cancelled_before_payment';
    return this.saleRepo.save(sale);
  }

  async cancelBeforePaymentByOpportunity(
    opportunityId: string,
    tenantId: string,
  ): Promise<Sale | null> {
    const sale = await this.findByOpportunity(opportunityId, tenantId);
    if (!sale || sale.status !== 'pending_payment') {
      return sale;
    }

    sale.status = 'cancelled_before_payment';
    return this.saleRepo.save(sale);
  }

  async markFailed(id: string, tenantId: string): Promise<Sale> {
    const sale = await this.findById(id, tenantId);
    if (!sale) throw new NotFoundException('Venda não encontrada');
    sale.status = 'failed';
    return this.saleRepo.save(sale);
  }

  async findByOpportunity(opportunityId: string, tenantId: string): Promise<Sale | null> {
    return this.saleRepo.findOne({ where: { opportunityId, tenantId } });
  }

  async findByAsaasPaymentId(
    asaasPaymentId: string,
    tenantId?: string,
  ): Promise<Sale | null> {
    return this.saleRepo.findOne({
      where: tenantId ? { asaasPaymentId, tenantId } : { asaasPaymentId },
    });
  }
}
