import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('opportunities')
@Index(['tenantId', 'documentNormalized'], { unique: true })
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column()
  name: string;

  @Column({ length: 18 })
  document: string;

  @Column({ name: 'document_normalized', length: 14 })
  documentNormalized: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string;

  @Column({ name: 'postal_code', length: 9, nullable: true })
  postalCode: string;

  @Column({ length: 255, nullable: true })
  address: string;

  @Column({ name: 'address_number', length: 20, nullable: true })
  addressNumber: string;

  @Column({ name: 'address_complement', length: 100, nullable: true })
  addressComplement: string;

  @Column({ length: 100, nullable: true })
  neighborhood: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 2, nullable: true })
  state: string;

  @Column({ name: 'plan_version_id', nullable: true })
  planVersionId: string;

  @Column({ name: 'payment_method', length: 20, nullable: true })
  paymentMethod: string;

  @Column({ length: 20, default: 'aberta' })
  status: string;

  @Column({ name: 'cancel_reason', length: 500, nullable: true })
  cancelReason: string;

  @Column({ name: 'cancelled_by_id', nullable: true })
  cancelledById: string;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'asaas_customer_id', length: 50, nullable: true })
  asaasCustomerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
