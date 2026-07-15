import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { isValidDocument, normalizeDocument } from '../opportunities/document-normalizer';
import { UpdateClientDto } from './dto/update-client.dto';

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
    const existing = await this.clientRepo.findOne({
      where: {
        tenantId,
        opportunityId: opportunity.id,
        type: 'holder',
      },
    });

    if (existing) {
      if (!existing.asaasCustomerId && asaasCustomerId) {
        existing.asaasCustomerId = asaasCustomerId;
        return this.clientRepo.save(existing);
      }
      return existing;
    }

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
    const existing = await this.clientRepo.findOne({
      where: { tenantId, documentNormalized: depData.documentNormalized },
    });

    if (existing) {
      if (existing.type === 'dependent' && existing.holderId === holderId) {
        return existing;
      }
      throw new BadRequestException('CPF/CNPJ já cadastrado nesta unidade');
    }

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

  async createDependentFromHolder(
    tenantId: string,
    holderId: string,
    depData: { name: string; document: string; phone?: string; email?: string; birthDate?: string },
  ): Promise<Client> {
    const holder = await this.findById(holderId, tenantId);
    if (!holder) throw new NotFoundException('Titular não encontrado');
    if (holder.type !== 'holder') throw new BadRequestException('Dependente só pode ser criado para um titular');

    const documentNormalized = normalizeDocument(depData.document);
    if (!isValidDocument(documentNormalized)) throw new BadRequestException('CPF inválido');
    if (normalizeDocument(holder.document) === documentNormalized) {
      throw new BadRequestException('CPF do dependente não pode ser igual ao do titular');
    }

    const existing = await this.clientRepo.findOne({ where: { tenantId, documentNormalized } });
    if (existing) throw new BadRequestException('CPF já cadastrado nesta unidade');

    const client = this.clientRepo.create({
      tenantId,
      opportunityId: holder.opportunityId,
      sellerId: holder.sellerId,
      holderId: holder.id,
      type: 'dependent',
      name: depData.name.trim(),
      document: depData.document,
      documentNormalized,
      phone: depData.phone?.trim() || undefined,
      email: depData.email?.trim() || undefined,
      birthDate: depData.birthDate || undefined,
      status: 'ativo',
    });

    return this.clientRepo.save(client);
  }

  async deleteDependentFromHolder(tenantId: string, holderId: string, dependentId: string): Promise<void> {
    const holder = await this.findById(holderId, tenantId);
    if (!holder) throw new NotFoundException('Titular não encontrado');
    if (holder.type !== 'holder') throw new BadRequestException('Dependente só pode ser removido de um titular');

    const dependent = await this.clientRepo.findOne({ where: { id: dependentId, tenantId, holderId } });
    if (!dependent) throw new NotFoundException('Dependente não encontrado');
    if (dependent.type !== 'dependent') throw new BadRequestException('Cliente não é dependente');

    await this.clientRepo.remove(dependent);
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

  async update(id: string, tenantId: string, data: UpdateClientDto): Promise<Client> {
    const client = await this.findById(id, tenantId);
    if (!client) throw new NotFoundException('Cliente não encontrado');

    if (data.document !== undefined) {
      const documentNormalized = normalizeDocument(data.document);
      if (!isValidDocument(documentNormalized)) {
        throw new BadRequestException('CPF/CNPJ inválido');
      }

      const existing = await this.clientRepo.findOne({
        where: { tenantId, documentNormalized },
      });

      if (existing && existing.id !== client.id) {
        throw new BadRequestException('CPF/CNPJ já cadastrado nesta unidade');
      }

      client.document = data.document;
      client.documentNormalized = documentNormalized;
    }

    const editableFields: Array<keyof UpdateClientDto> = [
      'name',
      'phone',
      'email',
      'birthDate',
      'postalCode',
      'address',
      'addressNumber',
      'addressComplement',
      'neighborhood',
      'city',
      'state',
    ];

    for (const field of editableFields) {
      const value = data[field];
      if (value !== undefined) {
        (client as any)[field] = typeof value === 'string' ? value.trim() : value;
      }
    }

    return this.clientRepo.save(client);
  }

  async setStatus(id: string, tenantId: string, status: string): Promise<Client> {
    const client = await this.findById(id, tenantId);
    if (!client) throw new NotFoundException('Cliente não encontrado');
    client.status = status;
    return this.clientRepo.save(client);
  }
}
