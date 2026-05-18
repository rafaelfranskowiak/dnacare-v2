import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, ConflictException, NotFoundException, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('tenants')
export class TenantController {
  constructor(private readonly service: TenantService) {}

  @Get('public')
  async listPublic() {
    return { data: await this.service.findAll() };
  }

  @Get()
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  async list() {
    return { data: await this.service.findAll() };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  async get(@Param('id') id: string) {
    const tenant = await this.service.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  async create(@Body() dto: CreateTenantDto) {
    const existing = await this.service.findBySlug(dto.slug);
    if (existing) throw new ConflictException('Slug already in use');
    return this.service.create({ name: dto.name, slug: dto.slug });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    if (dto.slug) {
      const existing = await this.service.findBySlug(dto.slug);
      if (existing && existing.id !== id) throw new ConflictException('Slug already in use');
    }
    const tenant = await this.service.update(id, dto);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return null;
  }

  @Patch(':id/asaas-config')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('super_admin')
  async updateAsaasConfig(
    @Param('id') id: string,
    @Body() body: { asaasApiKey?: string; asaasSandbox?: boolean; asaasWebhookUrl?: string },
  ) {
    const tenant = await this.service.updateAsaasConfig(id, body);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return {
      id: tenant.id,
      asaasSandbox: tenant.asaasSandbox,
      asaasWebhookConfigured: !!tenant.asaasWebhookId,
    };
  }
}
