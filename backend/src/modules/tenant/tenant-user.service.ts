import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantUser } from './tenant-user.entity';

@Injectable()
export class TenantUserService {
  constructor(
    @InjectRepository(TenantUser)
    private readonly repo: Repository<TenantUser>,
  ) {}

  findByUserAndTenant(userId: string, tenantId: string): Promise<TenantUser | null> {
    return this.repo.findOne({ where: { userId, tenantId, status: 'active' } });
  }

  findByTenant(tenantId: string): Promise<TenantUser[]> {
    return this.repo.find({ where: { tenantId } });
  }

  create(data: Partial<TenantUser>): Promise<TenantUser> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async updateRole(id: string, role: string, teamId?: string): Promise<TenantUser | null> {
    const data: any = { role };
    if (teamId !== undefined) data.teamId = teamId || null;
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: string): Promise<TenantUser | null> {
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
