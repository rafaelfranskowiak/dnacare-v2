import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TeamService } from './team.service';

@Controller('teams')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async list(@Request() req: any) {
    return { data: await this.teamService.findAll(req.tenantId) };
  }

  @Post()
  @Roles('admin')
  @UseGuards(RolesGuard)
  async create(@Request() req: any, @Body() body: { name: string; managerId: string }) {
    return this.teamService.create(req.tenantId, body.name, body.managerId);
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string) {
    return this.teamService.findById(id, req.tenantId);
  }

  @Patch(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async update(@Request() req: any, @Param('id') id: string, @Body() body: { name?: string; managerId?: string }) {
    return this.teamService.update(id, req.tenantId, body);
  }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.teamService.remove(id, req.tenantId);
    return null;
  }

  @Get(':id/members')
  async getMembers(@Request() req: any, @Param('id') id: string) {
    return { data: await this.teamService.getMembers(id, req.tenantId) };
  }

  @Post(':id/members')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async addMember(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { userId: string; role: 'admin' | 'gerente' | 'representante' },
  ) {
    return this.teamService.addMember(id, body.userId, req.tenantId, body.role);
  }

  @Delete(':id/members/:userId')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async removeMember(@Request() req: any, @Param('userId') userId: string) {
    await this.teamService.removeMember(userId, req.tenantId);
    return null;
  }
}
