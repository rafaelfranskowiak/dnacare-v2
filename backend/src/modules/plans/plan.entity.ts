import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 2 })
  type: 'PF' | 'PJ';

  @Column({ type: 'varchar', length: 20, default: 'rascunho' })
  status: 'rascunho' | 'publicado' | 'inativo' | 'arquivado';

  @Column({ name: 'available_for_sale', default: false })
  availableForSale: boolean;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
