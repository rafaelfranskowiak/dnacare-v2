import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClientService } from './client.service';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { AsaasService } from '../asaas/asaas.service';

@Controller('clients')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly subService: SubscriptionService,
    private readonly asaasService: AsaasService,
  ) {}

  @Get()
  async list(@Request() req: any, @Query() query: any) {
    const result = await this.clientService.findAll(req.tenantId, query);
    return { data: result.data, meta: { page: query.page || 1, limit: query.limit || 20, total: result.total } };
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string) {
    const client = await this.clientService.findById(id, req.tenantId);
    if (!client) return null;
    const deps = client.type === 'holder' ? await this.clientService.findDependents(client.id, req.tenantId) : [];
    const subscription = await this.subService.findByClient(client.id, req.tenantId);
    return { ...client, dependents: deps, subscription: subscription ? { id: subscription.id, status: subscription.status, planName: subscription.planName, recurringValue: subscription.recurringValue, startDate: subscription.startDate, asaasSubscriptionId: subscription.asaasSubscriptionId } : null };
  }

  @Post(':id/dependents')
  @Roles('admin', 'gerente', 'representante')
  @UseGuards(RolesGuard)
  async addDependent(@Request() req: any, @Param('id') id: string, @Body() body: { name: string; document: string; phone?: string; email?: string; birthDate?: string }) {
    return this.clientService.createDependentFromHolder(req.tenantId, id, body);
  }

  @Delete(':id/dependents/:dependentId')
  @Roles('admin', 'gerente', 'representante')
  @UseGuards(RolesGuard)
  async deleteDependent(@Request() req: any, @Param('id') id: string, @Param('dependentId') dependentId: string) {
    await this.clientService.deleteDependentFromHolder(req.tenantId, id, dependentId);
    return null;
  }

  @Patch(':id')
  @Roles('admin', 'gerente', 'representante')
  @UseGuards(RolesGuard)
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.clientService.update(id, req.tenantId, body);
  }

  @Post(':id/reactivate-plan')
  @Roles('admin', 'gerente')
  @UseGuards(RolesGuard)
  async reactivatePlan(@Request() req: any, @Param('id') id: string) {
    const client = await this.clientService.findById(id, req.tenantId);
    if (!client || client.type !== 'holder') return null;

    await this.clientService.setStatus(id, req.tenantId, 'ativo');

    const deps = await this.clientService.findDependents(id, req.tenantId);
    for (const dep of deps) {
      await this.clientService.setStatus(dep.id, req.tenantId, 'ativo');
    }

    const subscription = await this.subService.findByClient(id, req.tenantId);
    if (subscription) {
      await this.subService.setStatus(subscription.id, 'ativa');
    }

    return {
      clientStatus: 'ativo',
      subscriptionStatus: subscription ? 'ativa' : null,
      dependentsStatus: 'ativo',
    };
  }

  @Post(':id/settle-debts')
  @Roles('admin', 'gerente')
  @UseGuards(RolesGuard)
  async settleDebts(@Request() req: any, @Param('id') id: string) {
    const client = await this.clientService.findById(id, req.tenantId);
    if (!client || client.type !== 'holder') return null;
    if (!client.asaasCustomerId) throw new BadRequestException('Cliente sem cadastro na Asaas');

    const paymentsResponse = await this.asaasService.getCustomerPayments(client.asaasCustomerId);
    const payments = Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : [];
    const totalDue = payments.reduce((acc: number, payment: any) => {
      const status = String(payment?.status || '').toUpperCase();
      const value = Number(payment?.value || 0);

      if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'CANCELLED', 'REFUNDED'].includes(status)) {
        return acc;
      }

      return acc + value;
    }, 0);

    if (totalDue <= 0) {
      return { consolidatedValue: 0, settlementUrl: null, paymentId: null };
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const payment = await this.asaasService.createPayment({
      customerId: client.asaasCustomerId,
      billingType: 'BOLETO',
      value: totalDue,
      dueDate: dueDateStr,
      description: `Quitação de débitos - ${client.name}`,
      externalReference: client.id,
    });

    return {
      consolidatedValue: totalDue,
      settlementUrl: payment.bankSlipUrl || payment.invoiceUrl || payment.paymentUrl || null,
      paymentId: payment.id,
    };
  }

  @Get(':id/financial')
  async financial(@Request() req: any, @Param('id') id: string) {
    const client = await this.clientService.findById(id, req.tenantId);
    if (!client || !client.asaasCustomerId) return { totalReceived: 0, totalDue: 0, payments: [] };
    const result = await this.asaasService.getCustomerPayments(client.asaasCustomerId);
    return { payments: result?.data || [], totalReceived: 0, totalDue: 0 };
  }

  @Post(':id/cancel-plan')
  @Roles('admin', 'gerente')
  @UseGuards(RolesGuard)
  async cancelPlan(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    const client = await this.clientService.findById(id, req.tenantId);
    if (!client || client.type !== 'holder') return null;
    const sub = await this.subService.findByClient(id, req.tenantId);
    let asaasError = null;
    if (sub?.asaasSubscriptionId) {
      try { await this.asaasService.cancelSubscription(sub.asaasSubscriptionId); } catch (e) { asaasError = (e as any).message; await this.subService.setStatus(sub.id, 'cancelamento_pendente'); }
    }
    await this.clientService.setStatus(id, req.tenantId, asaasError ? 'cancelamento_pendente' : 'inativo');
    const deps = await this.clientService.findDependents(id, req.tenantId);
    for (const dep of deps) {
      await this.clientService.setStatus(dep.id, req.tenantId, 'vinculado_a_titular_inativo');
    }
    return { clientStatus: asaasError ? 'cancelamento_pendente' : 'inativo', subscriptionStatus: asaasError ? 'cancelamento_pendente' : 'inativa', dependentsStatus: 'vinculado_a_titular_inativo', asaasCancellation: { success: !asaasError, error: asaasError } };
  }
}
