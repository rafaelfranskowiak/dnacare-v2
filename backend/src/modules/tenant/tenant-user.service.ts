import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantUser } from './tenant-user.entity';
import { Team } from './team.entity';

@Injectable()
export class TenantUserService {
  constructor(
    @InjectRepository(TenantUser)
    private readonly repo: Repository<TenantUser>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
  ) {}

  findByUserAndTenant(userId: string, tenantId: string): Promise<TenantUser | null> {
    return this.repo.findOne({ where: { userId, tenantId, status: 'active' } });
  }

  findAnyByUserAndTenant(userId: string, tenantId: string): Promise<TenantUser | null> {
    return this.repo.findOne({ where: { userId, tenantId } });
  }

  findByTenant(tenantId: string): Promise<TenantUser[]> {
    return this.repo.find({ where: { tenantId } });
  }

  findById(id: string, tenantId?: string): Promise<TenantUser | null> {
    return this.repo.findOne({
      where: tenantId ? { id, tenantId } : { id },
    });
  }

  create(data: Partial<TenantUser>): Promise<TenantUser> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async updateRole(
    id: string,
    tenantId: string,
    role: string,
    teamId?: string | null,
  ): Promise<TenantUser | null> {
    if (teamId) {
      const team = await this.teamRepo.findOne({ where: { id: teamId, tenantId } });
      if (!team) {
        throw new BadRequestException('Time não pertence a esta unidade');
      }
    }

    const data: Partial<TenantUser> = { role };
    if (teamId !== undefined) data.teamId = teamId;
    await this.repo.update({ id, tenantId }, data);
    return this.findById(id, tenantId);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: string,
  ): Promise<TenantUser | null> {
    await this.repo.update({ id, tenantId }, { status });
    return this.findById(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}
