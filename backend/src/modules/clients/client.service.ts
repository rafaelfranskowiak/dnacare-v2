import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async createFromOpportunity(
    tenantId: string,
    opportunity: any,
    sellerId: string,
    asaasCustomerId: string,
  ): Promise<Client> {
    const client = this.clientRepo.create({
      tenantId,
      opportunityId: opportunity.id,
      sellerId,
      type: 'holder',
      name: opportunity.name,
      document: opportunity.document,
      documentNormalized: opportunity.documentNormalized,
      phone: opportunity.phone,
      email: opportunity.email,
      birthDate: opportunity.birthDate,
      postalCode: opportunity.postalCode,
      address: opportunity.address,
      addressNumber: opportunity.addressNumber,
      addressComplement: opportunity.addressComplement,
      neighborhood: opportunity.neighborhood,
      city: opportunity.city,
      state: opportunity.state,
      status: 'ativo',
      asaasCustomerId,
    });
    return this.clientRepo.save(client);
  }

  async createDependentFromOpportunity(
    tenantId: string,
    opportunityId: string,
    holderId: string,
    sellerId: string,
    depData: { name: string; document: string; documentNormalized: string },
  ): Promise<Client> {
    const client = this.clientRepo.create({
      tenantId,
      opportunityId,
      sellerId,
      holderId,
      type: 'dependent',
      name: depData.name,
      document: depData.document,
      documentNormalized: depData.documentNormalized,
      status: 'ativo',
    });
    return this.clientRepo.save(client);
  }

  async findAll(tenantId: string, filters: any): Promise<{ data: Client[]; total: number }> {
    const qb = this.clientRepo.createQueryBuilder('c').where('c.tenant_id = :tenantId', { tenantId });
    if (filters.type) qb.andWhere('c.type = :type', { type: filters.type });
    if (filters.status) qb.andWhere('c.status = :status', { status: filters.status });
    if (filters.sellerId) qb.andWhere('c.seller_id = :sellerId', { sellerId: filters.sellerId });
    if (filters.search) {
      qb.andWhere('(c.name ILIKE :s OR c.document_normalized ILIKE :s2)', { s: `%${filters.search}%`, s2: `%${filters.search}%` });
    }
    qb.orderBy('c.created_at', 'DESC');
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string, tenantId: string): Promise<Client | null> {
    return this.clientRepo.findOne({ where: { id, tenantId } });
  }

  async findDependents(holderId: string, tenantId: string): Promise<Client[]> {
    return this.clientRepo.find({ where: { holderId, tenantId } });
  }

  async update(id: string, tenantId: string, data: Partial<Client>): Promise<Client> {
    const client = await this.findById(id, tenantId);
    if (!client) throw new NotFoundException('Cliente não encontrado');
    Object.assign(client, data);
    return this.clientRepo.save(client);
  }

  async setStatus(id: string, tenantId: string, status: string): Promise<Client> {
    const client = await this.findById(id, tenantId);
    if (!client) throw new NotFoundException('Cliente não encontrado');
    client.status = status;
    return this.clientRepo.save(client);
  }
}
