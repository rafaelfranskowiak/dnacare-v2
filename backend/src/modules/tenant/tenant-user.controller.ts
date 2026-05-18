import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { TenantUserService } from './tenant-user.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserStatusDto } from './dto/update-tenant-user.dto';

@Controller('tenant-users')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class TenantUserController {
  constructor(private readonly service: TenantUserService) {}

  @Get()
  async list(@Query('tenant_id') tenantId?: string) {
    if (tenantId) {
      return { data: await this.service.findByTenant(tenantId) };
    }
    return { data: [] };
  }

  @Post()
  async create(@Body() dto: CreateTenantUserDto) {
    const existing = await this.service.findByUserAndTenant(dto.user_id, dto.tenant_id);
    if (existing) {
      throw new ConflictException('User is already linked to this tenant');
    }
    const entity = await this.service.create({
      tenantId: dto.tenant_id,
      userId: dto.user_id,
      status: dto.status || 'active',
    });
    return entity;
  }

  @Patch(':id')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantUserStatusDto,
  ) {
    const entity = await this.service.updateStatus(id, dto.status);
    if (!entity) throw new NotFoundException('TenantUser link not found');
    return entity;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return null;
  }
}
