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

@Controller('tenant-users')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class TenantUserController {
  constructor(private readonly service: TenantUserService) {}

  @Get()
  async list(@Request() req: any, @Query('tenant_id') tenantId?: string) {
    const tid = tenantId || req.tenantId;
    return { data: await this.service.findByTenant(tid) };
  }

  @Post()
  @Roles('admin')
  @UseGuards(RolesGuard)
  async create(@Body() dto: CreateTenantUserDto) {
    const existing = await this.service.findByUserAndTenant(dto.user_id, dto.tenant_id);
    if (existing) throw new ConflictException('Usuário já vinculado a esta unidade');
    return this.service.create({
      tenantId: dto.tenant_id,
      userId: dto.user_id,
      status: dto.status || 'active',
    });
  }

  @Patch(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() body: { role?: string; teamId?: string; status?: string },
  ) {
    if (body.status) {
      const entity = await this.service.updateStatus(id, body.status);
      if (!entity) throw new NotFoundException('Vínculo não encontrado');
      return entity;
    }
    const entity = await this.service.updateRole(id, body.role || '', body.teamId);
    if (!entity) throw new NotFoundException('Vínculo não encontrado');
    return entity;
  }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return null;
  }
}
