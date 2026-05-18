import {
  Controller, Get, Post, Patch, Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PlanService } from './plan.service';
import { CreatePlanDto, UpdatePlanDto, PublishPlanDto } from './dto/plan.dto';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  async list() {
    return { data: await this.planService.findAll() };
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('super_admin')
  async create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Get('available')
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  async available() {
    return { data: await this.planService.getAvailable() };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('super_admin')
  async get(@Param('id') id: string) {
    const { plan, versions } = await this.planService.findWithVersions(id);
    return { ...plan, versions };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('super_admin')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.planService.update(id, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('super_admin')
  async publish(@Param('id') id: string, @Body() dto: PublishPlanDto) {
    return { planVersion: await this.planService.publish(id, dto) };
  }

  @Post(':id/versions')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('super_admin')
  async newVersion(@Param('id') id: string) {
    return this.planService.createNewVersion(id);
  }

  @Post(':id/inactivate')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('super_admin')
  async inactivate(@Param('id') id: string) {
    return this.planService.inactivate(id);
  }

  @Get(':id/clients')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('super_admin')
  async clients(@Param('id') id: string) {
    return { data: await this.planService.getClientsByPlan(id) };
  }
}
