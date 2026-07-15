import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClientService } from './client.service';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { AsaasService, AsaasTenantContext } from '../asaas/asaas.service';
import { TenantService } from '../tenant/tenant.service';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly subService: SubscriptionService,
    private readonly asaasService: AsaasService,
    private readonly tenantService: TenantService,
  ) {}

  private async getAsaasContext(tenantId: string): Promise<AsaasTenantContext> {
    const tenant = await this.tenantService.findByIdWithAsaasConfig(tenantId);
    if (!tenant?.asaasApiKey) {
      throw new BadRequestException('Configuração Asaas não concluída para esta unidade');
    }

    return {
      tenantId: tenant.id,
      apiKey: tenant.asaasApiKey,
      sandbox: tenant.asaasSandbox,
    };
  }

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
  async update(@Request() req: any, @Param('id') id: string, @Body() body: UpdateClientDto) {
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
      await this.subService.setStatus(subscription.id, req.tenantId, 'ativa');
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
  async settleDebts() {
    throw new BadRequestException(
      'Quitação consolidada temporariamente indisponível: é necessário vincular e cancelar as cobranças originais antes de gerar um acordo.',
    );
  }

  @Get(':id/financial')
  async financial(@Request() req: any, @Param('id') id: string) {
    const client = await this.clientService.findById(id, req.tenantId);
    if (!client || !client.asaasCustomerId) return { totalReceived: 0, totalDue: 0, payments: [] };
    const asaasContext = await this.getAsaasContext(req.tenantId);
    const result = await this.asaasService.getCustomerPayments(
      client.asaasCustomerId,
      asaasContext,
    );
    const payments = Array.isArray(result?.data) ? result.data : [];
    const receivedStatuses = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']);
    const dueStatuses = new Set(['PENDING', 'OVERDUE', 'DUNNING_REQUESTED']);

    const totals = payments.reduce(
      (acc: { totalReceived: number; totalDue: number }, payment: any) => {
        const status = String(payment?.status || '').toUpperCase();
        const value = Number(payment?.value || 0);

        if (receivedStatuses.has(status)) {
          acc.totalReceived += value;
        } else if (dueStatuses.has(status)) {
          acc.totalDue += value;
        }

        return acc;
      },
      { totalReceived: 0, totalDue: 0 },
    );

    return { payments, ...totals };
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
      try {
        const asaasContext = await this.getAsaasContext(req.tenantId);
        await this.asaasService.cancelSubscription(sub.asaasSubscriptionId, asaasContext);
      } catch (e) { asaasError = (e as any).message; await this.subService.setStatus(sub.id, req.tenantId, 'cancelamento_pendente'); }
    }
    await this.clientService.setStatus(id, req.tenantId, asaasError ? 'cancelamento_pendente' : 'inativo');
    const deps = await this.clientService.findDependents(id, req.tenantId);
    for (const dep of deps) {
      await this.clientService.setStatus(dep.id, req.tenantId, 'vinculado_a_titular_inativo');
    }
    return { clientStatus: asaasError ? 'cancelamento_pendente' : 'inativo', subscriptionStatus: asaasError ? 'cancelamento_pendente' : 'inativa', dependentsStatus: 'vinculado_a_titular_inativo', asaasCancellation: { success: !asaasError, error: asaasError } };
  }
}
