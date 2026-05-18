import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly tenantService: TenantService,
  ) {}

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: { name: string; email: string; password: string; tenantId: string }): Promise<User> {
    const tenant = await this.tenantService.findBySlug(data.tenantId);
    const hashed = await bcrypt.hash(data.password, 10);
    const entity = this.repo.create({ ...data, password: hashed, tenantId: tenant?.id || data.tenantId });
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    if (data.tenantId) {
      const tenant = await this.tenantService.findBySlug(data.tenantId);
      if (tenant) data.tenantId = tenant.id;
    }
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
