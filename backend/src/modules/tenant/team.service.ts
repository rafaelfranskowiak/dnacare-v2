import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';
import { TenantUser } from './tenant-user.entity';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TenantUser)
    private readonly tenantUserRepo: Repository<TenantUser>,
  ) {}

  findAll(tenantId: string): Promise<Team[]> {
    return this.teamRepo.find({ where: { tenantId } });
  }

  findById(id: string, tenantId: string): Promise<Team | null> {
    return this.teamRepo.findOne({ where: { id, tenantId } });
  }

  private async validateManager(managerId: string, tenantId: string): Promise<void> {
    const manager = await this.tenantUserRepo.findOne({
      where: { userId: managerId, tenantId, status: 'active' },
    });

    if (!manager || !['admin', 'gerente'].includes(manager.role)) {
      throw new BadRequestException('Gestor deve ser administrador ou gerente ativo desta unidade');
    }
  }

  async create(tenantId: string, name: string, managerId: string): Promise<Team> {
    await this.validateManager(managerId, tenantId);
    const team = this.teamRepo.create({ tenantId, name, managerId });
    return this.teamRepo.save(team);
  }

  async update(id: string, tenantId: string, data: Partial<Pick<Team, 'name' | 'managerId'>>): Promise<Team> {
    const team = await this.findById(id, tenantId);
    if (!team) throw new BadRequestException('Time não encontrado');

    if (data.managerId !== undefined) {
      await this.validateManager(data.managerId, tenantId);
    }

    Object.assign(team, data);
    return this.teamRepo.save(team);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const team = await this.findById(id, tenantId);
    if (!team) throw new BadRequestException('Time não encontrado');
    await this.teamRepo.remove(team);
  }

  async getMembers(teamId: string, tenantId: string): Promise<TenantUser[]> {
    return this.tenantUserRepo.find({ where: { teamId, tenantId } });
  }

  async addMember(
    teamId: string,
    userId: string,
    tenantId: string,
    role: 'admin' | 'gerente' | 'representante',
  ): Promise<TenantUser> {
    const team = await this.findById(teamId, tenantId);
    if (!team) throw new BadRequestException('Time não encontrado nesta unidade');

    const existing = await this.tenantUserRepo.findOne({
      where: { userId, tenantId, status: 'active' },
    });
    if (!existing) throw new BadRequestException('Usuário não pertence a esta unidade');

    existing.teamId = team.id;
    existing.role = role;
    return this.tenantUserRepo.save(existing);
  }

  async removeMember(teamId: string, userId: string, tenantId: string): Promise<TenantUser> {
    const member = await this.tenantUserRepo.findOne({
      where: { userId, tenantId, teamId },
    });

    if (!member) {
      throw new BadRequestException('Membro não encontrado neste time');
    }

    member.teamId = null;
    return this.tenantUserRepo.save(member);
  }
}
