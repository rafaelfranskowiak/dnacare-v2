import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, ConflictException, NotFoundException, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  async list(@Request() req: any) {
    const users = req.user.is_platform_admin
      ? await this.service.findAll()
      : await this.service.findByTenant(req.tenantId);

    return {
      data: users.map(({ password, ...user }) => user),
    };
  }

  @Post()
  @Roles('admin')
  @UseGuards(RolesGuard)
  async create(@Request() req: any, @Body() dto: CreateUserDto) {
    const existing = await this.service.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const tenantId = req.user.is_platform_admin ? dto.tenantId : req.tenantId;
    const user = await this.service.create({ ...dto, tenantId });
    const { password, ...rest } = user;
    return rest;
  }

  @Patch(':id')
  @Roles('super_admin')
  @UseGuards(RolesGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    if (dto.email) {
      const existing = await this.service.findByEmail(dto.email);
      if (existing && existing.id !== id) throw new ConflictException('Email already in use');
    }
    const user = await this.service.update(id, dto);
    if (!user) throw new NotFoundException('User not found');
    const { password, ...rest } = user;
    return rest;
  }

  @Delete(':id')
  @Roles('super_admin')
  @UseGuards(RolesGuard)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return null;
  }
}
