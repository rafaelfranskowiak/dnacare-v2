import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'opportunity_id' })
  opportunityId: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'team_id', nullable: true })
  teamId: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @Column({ name: 'plan_version_id' })
  planVersionId: string;

  @Column({ name: 'plan_snapshot', type: 'jsonb' })
  planSnapshot: Record<string, any>;

  @Column({ name: 'dependent_count', type: 'int', default: 0 })
  dependentCount: number;

  @Column({ name: 'total_lives', type: 'int', default: 1 })
  totalLives: number;

  @Column({ name: 'base_value', type: 'decimal', precision: 10, scale: 2 })
  baseValue: number;

  @Column({ name: 'dependents_value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  dependentsValue: number;

  @Column({ name: 'admission_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  admissionFee: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ name: 'discount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ name: 'total_value', type: 'decimal', precision: 10, scale: 2 })
  totalValue: number;

  @Column({ name: 'calculation_memory', type: 'jsonb' })
  calculationMemory: Record<string, any>;

  @Column({ name: 'payment_method', length: 20 })
  paymentMethod: string;

  @Column({ length: 30, default: 'pending_payment' })
  status: string;

  @Column({ name: 'asaas_customer_id', length: 50, nullable: true })
  asaasCustomerId: string;

  @Column({ name: 'asaas_payment_id', length: 50, nullable: true })
  asaasPaymentId: string;

  @Column({ name: 'asaas_checkout_url', length: 500, nullable: true })
  asaasCheckoutUrl: string;

  @Column({ name: 'asaas_bankslip_url', length: 500, nullable: true })
  asaasBankSlipUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
