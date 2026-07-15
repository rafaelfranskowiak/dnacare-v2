import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('subscriptions')
@Index(['tenantId', 'clientId'], { unique: true })
@Index('UQ_subscriptions_tenant_sale', ['tenantId', 'saleId'], { unique: true })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'sale_id' })
  saleId: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @Column({ name: 'plan_version_id' })
  planVersionId: string;

  @Column({ name: 'plan_name' })
  planName: string;

  @Column({ name: 'recurring_value', type: 'decimal', precision: 10, scale: 2 })
  recurringValue: number;

  @Column({ name: 'dependent_rule', length: 20 })
  dependentRule: string;

  @Column({ name: 'dependent_count', type: 'int', default: 0 })
  dependentCount: number;

  @Column({ length: 30, default: 'ativa' })
  status: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'billing_cycle', length: 20, default: 'MONTHLY' })
  billingCycle: string;

  @Column({ name: 'next_due_date', type: 'date', nullable: true })
  nextDueDate: string | null;

  @Column({ name: 'cancel_reason', length: 500, nullable: true })
  cancelReason: string;

  @Column({ name: 'cancelled_by_id', nullable: true })
  cancelledById: string;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'asaas_subscription_id', length: 50, nullable: true })
  asaasSubscriptionId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
