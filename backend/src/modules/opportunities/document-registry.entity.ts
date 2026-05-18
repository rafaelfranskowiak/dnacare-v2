import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('document_registry')
@Index(['tenantId', 'documentNormalized'], { unique: true })
export class DocumentRegistry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'document_normalized', length: 14 })
  documentNormalized: string;

  @Column({ name: 'entity_type', length: 30 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
