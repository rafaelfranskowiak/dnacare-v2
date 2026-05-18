import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('opportunity_dependents')
export class OpportunityDependent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'opportunity_id' })
  opportunityId: string;

  @Column()
  name: string;

  @Column({ length: 18 })
  document: string;

  @Column({ name: 'document_normalized', length: 14 })
  documentNormalized: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
