import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantUserService } from './tenant-user.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';

@Controller('tenant-users')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class TenantUserController {
  constructor(private readonly service: TenantUserService) {}

  @Get()
  async list(@Request() req: any, @Query('tenant_id') requestedTenantId?: string) {
    const tenantId = req.user.is_platform_admin && requestedTenantId
      ? requestedTenantId
      : req.tenantId;

    return { data: await this.service.findByTenant(tenantId) };
  }

  @Post()
  @Roles('admin')
  @UseGuards(RolesGuard)
  async create(@Request() req: any, @Body() dto: CreateTenantUserDto) {
    const tenantId = req.user.is_platform_admin ? dto.tenant_id : req.tenantId;
    const existing = await this.service.findAnyByUserAndTenant(dto.user_id, tenantId);

    if (existing) {
      throw new ConflictException('Usuário já vinculado a esta unidade');
    }

    return this.service.create({
      tenantId,
      userId: dto.user_id,
      role: dto.role || 'representante',
      status: dto.status || 'active',
    });
  }

  @Patch(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateTenantUserDto,
  ) {
    const existing = await this.service.findById(
      id,
      req.user.is_platform_admin ? undefined : req.tenantId,
    );

    if (!existing) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    if (body.status) {
      const entity = await this.service.updateStatus(id, existing.tenantId, body.status);
      if (!entity) throw new NotFoundException('Vínculo não encontrado');
      return entity;
    }

    const entity = await this.service.updateRole(
      id,
      existing.tenantId,
      body.role || existing.role || 'representante',
      body.teamId,
    );

    if (!entity) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    return entity;
  }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async remove(@Request() req: any, @Param('id') id: string) {
    const existing = await this.service.findById(
      id,
      req.user.is_platform_admin ? undefined : req.tenantId,
    );

    if (!existing) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    await this.service.remove(id, existing.tenantId);
    return null;
  }
}
