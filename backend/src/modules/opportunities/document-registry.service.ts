import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentRegistry } from './document-registry.entity';

@Injectable()
export class DocumentRegistryService {
  constructor(
    @InjectRepository(DocumentRegistry)
    private readonly repo: Repository<DocumentRegistry>,
  ) {}

  async register(tenantId: string, documentNormalized: string, entityType: string, entityId: string): Promise<DocumentRegistry> {
    try {
      const record = new DocumentRegistry();
      record.tenantId = tenantId;
      record.documentNormalized = documentNormalized;
      record.entityType = entityType;
      record.entityId = entityId;
      const saved = await this.repo.save(record);
      return saved;
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new BadRequestException('CPF/CNPJ já cadastrado nesta unidade');
      }
      throw err;
    }
  }

  async checkExists(tenantId: string, documentNormalized: string): Promise<DocumentRegistry | null> {
    return this.repo.findOne({ where: { tenantId, documentNormalized } });
  }

  async release(tenantId: string, documentNormalized: string): Promise<void> {
    await this.repo.delete({ tenantId, documentNormalized });
  }
}
