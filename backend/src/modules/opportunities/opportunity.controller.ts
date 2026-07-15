import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OpportunityService } from './opportunity.service';
import { ViaCepService } from './viacep.service';
import { CreateOpportunityDto, UpdateOpportunityDto, CancelOpportunityDto, AddDependentDto, GenerateCheckoutDto } from './dto/opportunity.dto';
import { SaleService } from '../sales/sale.service';
import { PlanVersion } from '../plans/plan-version.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('opportunities')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class OpportunityController {
  constructor(
    private readonly oppService: OpportunityService,
    private readonly viaCep: ViaCepService,
    private readonly saleService: SaleService,
    @InjectRepository(PlanVersion)
    private readonly planVersionRepo: Repository<PlanVersion>,
  ) {}

  @Get()
  async list(@Request() req: any, @Query() query: any) {
    const result = await this.oppService.findAll(req.tenantId, query);
    return { data: result.data, meta: { page: query.page || 1, limit: query.limit || 20, total: result.total } };
  }

  @Post()
  @Roles('representante', 'gerente', 'admin')
  @UseGuards(RolesGuard)
  async create(@Request() req: any, @Body() dto: CreateOpportunityDto) {
    return this.oppService.create(req.tenantId, req.user.id, dto.name, dto.document);
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string) {
    const opp = await this.oppService.findById(id, req.tenantId);
    const deps = await this.oppService.getDependents(id);
    let sale: any = null;
    try { const s = await this.saleService.findByOpportunity(id, req.tenantId); if (s) sale = { id: s.id, status: s.status, totalValue: s.totalValue }; } catch {}
    return { ...opp, dependents: deps, sale };
  }

  @Patch(':id')
  @Roles('representante', 'gerente', 'admin')
  @UseGuards(RolesGuard)
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateOpportunityDto) {
    return this.oppService.update(id, req.tenantId, dto as any);
  }

  @Post(':id/dependents')
  @Roles('representante', 'gerente', 'admin')
  @UseGuards(RolesGuard)
  async addDependent(@Request() req: any, @Param('id') id: string, @Body() dto: AddDependentDto) {
    return this.oppService.addDependent(id, dto.name, dto.document, req.tenantId);
  }

  @Delete(':id/dependents/:dependentId')
  @Roles('representante', 'gerente', 'admin')
  @UseGuards(RolesGuard)
  async removeDependent(@Param('id') id: string, @Param('dependentId') depId: string) {
    await this.oppService.removeDependent(id, depId);
    return null;
  }

  @Post(':id/cancel')
  @Roles('representante', 'gerente', 'admin')
  @UseGuards(RolesGuard)
  async cancel(@Request() req: any, @Param('id') id: string, @Body() dto: CancelOpportunityDto) {
    const opp = await this.oppService.cancel(id, req.tenantId, dto.reason, req.user.id);
    let saleStatus: string | null = null;
    try {
      const sale = await this.saleService.cancelBeforePayment(id, req.tenantId);
      saleStatus = sale?.status;
    } catch {}
    return { id: opp.id, status: opp.status, cancelReason: opp.cancelReason, cancelledAt: opp.cancelledAt, saleStatus };
  }

  @Get(':id/validate-checkout')
  async validateCheckout(@Request() req: any, @Param('id') id: string) {
    return this.oppService.validateCheckout(id, req.tenantId);
  }

  @Post(':id/generate-checkout')
  @Roles('representante', 'gerente', 'admin')
  @UseGuards(RolesGuard)
  async generateCheckout(@Request() req: any, @Param('id') id: string, @Body() dto: GenerateCheckoutDto) {
    const opp = await this.oppService.findById(id, req.tenantId);
    const planVersion = await this.planVersionRepo.findOne({ where: { id: dto.planVersionId } });
    if (!planVersion) throw new (await import('@nestjs/common')).NotFoundException('Versão do plano não encontrada');

    const deps = await this.oppService.getDependents(id);
    const result = await this.saleService.generateCheckout(req.tenantId, opp, planVersion, dto.paymentMethod, deps.length);

    await this.oppService.setCheckoutGenerated(id, req.tenantId, result.sale.asaasCustomerId);

    return {
      saleId: result.sale.id,
      status: result.sale.status,
      checkoutUrl: result.checkoutUrl,
      bankSlipUrl: result.bankSlipUrl,
      totalValue: result.sale.totalValue,
      calculationMemory: result.sale.calculationMemory,
    };
  }

  @Get('cep/:cep')
  async lookupCep(@Param('cep') cep: string) {
    const addr = await this.viaCep.fetchAddress(cep);
    if (!addr) return null;
    return addr;
  }
}
