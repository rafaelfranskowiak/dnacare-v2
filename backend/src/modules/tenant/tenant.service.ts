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

  async findAll(): Promise<Array<Tenant & { asaasConfigured: boolean }>> {
    const tenants = await this.repo
      .createQueryBuilder('tenant')
      .addSelect('tenant.asaasApiKey')
      .orderBy('tenant.createdAt', 'DESC')
      .getMany();

    return tenants.map((tenant) => {
      const { asaasApiKey, asaasWebhookAuthToken, ...safeTenant } = tenant;
      return {
        ...safeTenant,
        asaasConfigured: Boolean(asaasApiKey),
      } as Tenant & { asaasConfigured: boolean };
    });
  }

  async findPublic(): Promise<Array<Pick<Tenant, 'id' | 'slug' | 'name'>>> {
    return this.repo.find({
      select: { id: true, slug: true, name: true },
      order: { name: 'ASC' },
    });
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  findByIdWithAsaasConfig(id: string): Promise<Tenant | null> {
    return this.repo
      .createQueryBuilder('tenant')
      .addSelect(['tenant.asaasApiKey', 'tenant.asaasWebhookAuthToken'])
      .where('tenant.id = :id', { id })
      .getOne();
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

  async updateAsaasConfig(
    id: string,
    data: { asaasApiKey?: string; asaasSandbox?: boolean; asaasWebhookUrl?: string },
  ): Promise<Tenant | null> {
    const update: Partial<Tenant> = {};
    if (data.asaasApiKey !== undefined) update.asaasApiKey = data.asaasApiKey;
    if (data.asaasSandbox !== undefined) update.asaasSandbox = data.asaasSandbox;
    if (data.asaasWebhookUrl !== undefined) update.asaasWebhookUrl = data.asaasWebhookUrl;
    await this.repo.update(id, update);
    return this.findById(id);
  }
}
