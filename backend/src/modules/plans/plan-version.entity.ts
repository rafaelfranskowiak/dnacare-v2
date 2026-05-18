import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('plan_versions')
export class PlanVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @Column({ type: 'int' })
  version: number;

  @Column()
  name: string;

  @Column({ name: 'base_value', type: 'decimal', precision: 10, scale: 2 })
  baseValue: number;

  @Column({ name: 'billing_cycle', length: 20, default: 'MONTHLY' })
  billingCycle: string;

  @Column({ name: 'dependent_rule', length: 20, default: 'none' })
  dependentRule: string;

  @Column({ name: 'included_dependents', type: 'int', default: 0 })
  includedDependents: number;

  @Column({ name: 'max_dependents', type: 'int', nullable: true })
  maxDependents: number;

  @Column({ name: 'min_dependents', type: 'int', default: 0 })
  minDependents: number;

  @Column({ name: 'dependent_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dependentValue: number;

  @Column({ name: 'tiers_config', type: 'jsonb', nullable: true })
  tiersConfig: Record<string, any>;

  @Column({ name: 'admission_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  admissionFee: number;

  @Column({ length: 20, default: 'rascunho' })
  status: 'rascunho' | 'publicado' | 'inativo';

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @Column({ name: 'inactivated_at', type: 'timestamptz', nullable: true })
  inactivatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
