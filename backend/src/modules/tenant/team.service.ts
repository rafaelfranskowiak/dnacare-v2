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

  async create(tenantId: string, name: string, managerId: string): Promise<Team> {
    const team = this.teamRepo.create({ tenantId, name, managerId });
    return this.teamRepo.save(team);
  }

  async update(id: string, tenantId: string, data: Partial<Pick<Team, 'name' | 'managerId'>>): Promise<Team> {
    const team = await this.findById(id, tenantId);
    if (!team) throw new BadRequestException('Time não encontrado');
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

  async addMember(teamId: string, userId: string, tenantId: string, role: 'admin' | 'gerente' | 'representante'): Promise<TenantUser> {
    const existing = await this.tenantUserRepo.findOne({ where: { userId, tenantId } });
    if (!existing) throw new BadRequestException('Usuário não pertence a esta unidade');
    existing.teamId = teamId;
    existing.role = role;
    return this.tenantUserRepo.save(existing);
  }

  async removeMember(userId: string, tenantId: string): Promise<TenantUser> {
    const member = await this.tenantUserRepo.findOne({ where: { userId, tenantId } });
    if (member) {
      member.teamId = '';
      return this.tenantUserRepo.save(member);
    }
    throw new BadRequestException('Membro não encontrado');
  }
}
