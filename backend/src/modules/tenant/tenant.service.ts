import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
  ) {}

  findAll(): Promise<Tenant[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  create(data: Partial<Tenant>): Promise<Tenant> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async updateAsaasConfig(id: string, data: { asaasApiKey?: string; asaasSandbox?: boolean; asaasWebhookUrl?: string }): Promise<Tenant | null> {
    const update: Partial<Tenant> = {};
    if (data.asaasApiKey !== undefined) update.asaasApiKey = data.asaasApiKey;
    if (data.asaasSandbox !== undefined) update.asaasSandbox = data.asaasSandbox;
    if (data.asaasWebhookUrl !== undefined) update.asaasWebhookUrl = data.asaasWebhookUrl;
    await this.repo.update(id, update);
    return this.findById(id);
  }
}
