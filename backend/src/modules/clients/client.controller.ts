import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
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

  @Patch(':id')
  @Roles('admin', 'gerente', 'representante')
  @UseGuards(RolesGuard)
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.clientService.update(id, req.tenantId, body);
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
