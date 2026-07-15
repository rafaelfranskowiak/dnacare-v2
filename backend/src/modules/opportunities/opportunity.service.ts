import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from './opportunity.entity';
import { OpportunityDependent } from './opportunity-dependent.entity';
import { DocumentRegistryService } from './document-registry.service';
import { normalizeDocument, isValidDocument } from './document-normalizer';

const ALLOWED_OPPORTUNITY_TRANSITIONS: Record<string, string[]> = {
  aberta: ['checkout_gerado', 'cancelada'],
  checkout_gerado: ['convertida', 'cancelada'],
  convertida: [],
  cancelada: [],
};

@Injectable()
export class OpportunityService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(OpportunityDependent)
    private readonly depRepo: Repository<OpportunityDependent>,
    private readonly docRegistry: DocumentRegistryService,
  ) {}

  async findAll(tenantId: string, filters: { status?: string; sellerId?: string; search?: string; page?: number; limit?: number }): Promise<{ data: Opportunity[]; total: number }> {
    const qb = this.oppRepo.createQueryBuilder('o').where('o.tenant_id = :tenantId', { tenantId });
    if (filters.status) qb.andWhere('o.status = :status', { status: filters.status });
    if (filters.sellerId) qb.andWhere('o.seller_id = :sellerId', { sellerId: filters.sellerId });
    if (filters.search) {
      qb.andWhere('(o.name ILIKE :search OR o.document LIKE :search2)', { search: `%${filters.search}%`, search2: `%${filters.search}%` });
    }
    qb.orderBy('o.created_at', 'DESC');
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string, tenantId: string): Promise<Opportunity | null> {
    return this.oppRepo.findOne({ where: { id, tenantId } });
  }

  async create(tenantId: string, sellerId: string, name: string, document: string): Promise<Opportunity> {
    const docNormalized = normalizeDocument(document);
    if (!isValidDocument(docNormalized)) throw new BadRequestException('CPF/CNPJ inválido');

    const existing = await this.docRegistry.checkExists(tenantId, docNormalized);
    if (existing) throw new BadRequestException('CPF/CNPJ já cadastrado nesta unidade');

    const opp = this.oppRepo.create({
      tenantId,
      sellerId,
      name,
      document,
      documentNormalized: docNormalized,
      status: 'aberta',
    });
    const saved = await this.oppRepo.save(opp);

    await this.docRegistry.register(tenantId, docNormalized, 'opportunity', saved.id);
    return saved;
  }

  async update(id: string, tenantId: string, data: Partial<Opportunity>): Promise<Opportunity> {
    const opp = await this.findById(id, tenantId);
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');
    if (opp.status === 'cancelada' || opp.status === 'convertida') {
      throw new BadRequestException('Não é possível editar uma oportunidade cancelada ou convertida');
    }
    if (data.document && data.document !== opp.document) {
      const docNormalized = normalizeDocument(data.document);
      if (!isValidDocument(docNormalized)) throw new BadRequestException('CPF/CNPJ inválido');
      const existing = await this.docRegistry.checkExists(tenantId, docNormalized);
      if (existing && existing.entityId !== id) throw new BadRequestException('CPF/CNPJ já cadastrado nesta unidade');
      data.documentNormalized = docNormalized;
    }
    Object.assign(opp, data);
    return this.oppRepo.save(opp);
  }

  async cancel(id: string, tenantId: string, reason: string, userId: string): Promise<Opportunity> {
    const opp = await this.findById(id, tenantId);
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');
    if (!ALLOWED_OPPORTUNITY_TRANSITIONS[opp.status]?.includes('cancelada')) {
      throw new BadRequestException(`Não é possível cancelar uma oportunidade com status "${opp.status}"`);
    }
    opp.status = 'cancelada';
    opp.cancelReason = reason;
    opp.cancelledById = userId;
    opp.cancelledAt = new Date();
    return this.oppRepo.save(opp);
  }

  async setCheckoutGenerated(id: string, tenantId: string, asaasCustomerId: string): Promise<Opportunity> {
    const opp = await this.findById(id, tenantId);
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');

    if (opp.status === 'checkout_gerado') {
      if (!opp.asaasCustomerId && asaasCustomerId) {
        opp.asaasCustomerId = asaasCustomerId;
        return this.oppRepo.save(opp);
      }
      return opp;
    }

    if (!ALLOWED_OPPORTUNITY_TRANSITIONS[opp.status]?.includes('checkout_gerado')) {
      throw new BadRequestException('Status inválido para gerar checkout');
    }

    opp.status = 'checkout_gerado';
    opp.asaasCustomerId = asaasCustomerId;
    return this.oppRepo.save(opp);
  }

  async convert(id: string, tenantId: string): Promise<Opportunity> {
    const opp = await this.findById(id, tenantId);
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');

    if (opp.status === 'convertida') {
      return opp;
    }

    if (!ALLOWED_OPPORTUNITY_TRANSITIONS[opp.status]?.includes('convertida')) {
      throw new BadRequestException('Status inválido para conversão');
    }

    opp.status = 'convertida';
    return this.oppRepo.save(opp);
  }

  async getDependents(
    opportunityId: string,
    tenantId?: string,
  ): Promise<OpportunityDependent[]> {
    if (tenantId) {
      const opportunity = await this.findById(opportunityId, tenantId);
      if (!opportunity) {
        throw new NotFoundException('Oportunidade não encontrada');
      }
    }

    return this.depRepo.find({ where: { opportunityId } });
  }

  async addDependent(opportunityId: string, name: string, document: string, tenantId: string): Promise<OpportunityDependent> {
    const opp = await this.oppRepo.findOne({ where: { id: opportunityId, tenantId } });
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');
    if (opp.status === 'cancelada' || opp.status === 'convertida') throw new BadRequestException('Status inválido');

    const docNormalized = normalizeDocument(document);
    if (normalizeDocument(opp.document) === docNormalized) throw new BadRequestException('CPF do dependente não pode ser igual ao do titular');

    const existingDep = await this.depRepo.findOne({ where: { opportunityId, documentNormalized: docNormalized } });
    if (existingDep) throw new BadRequestException('Dependente já cadastrado nesta oportunidade');

    const dep = this.depRepo.create({ opportunityId, name, document, documentNormalized: docNormalized });
    return this.depRepo.save(dep);
  }

  async removeDependent(
    opportunityId: string,
    dependentId: string,
    tenantId: string,
  ): Promise<void> {
    const opportunity = await this.findById(opportunityId, tenantId);
    if (!opportunity) {
      throw new NotFoundException('Oportunidade não encontrada');
    }

    const dep = await this.depRepo.findOne({ where: { id: dependentId, opportunityId } });
    if (!dep) throw new NotFoundException('Dependente não encontrado');
    await this.depRepo.remove(dep);
  }

  async validateCheckout(id: string, tenantId: string): Promise<{ canGenerate: boolean; missingFields: string[] }> {
    const opp = await this.findById(id, tenantId);
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');

    const required = ['name', 'document', 'phone', 'email', 'birthDate', 'postalCode', 'address', 'addressNumber', 'neighborhood', 'city', 'state', 'planVersionId', 'paymentMethod'];
    const missing = required.filter((field) => !(opp as any)[field]);
    return { canGenerate: missing.length === 0, missingFields: missing };
  }
}
