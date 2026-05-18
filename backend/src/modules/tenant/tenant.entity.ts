import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'asaas_api_key', nullable: true })
  asaasApiKey: string;

  @Column({ name: 'asaas_sandbox', default: true })
  asaasSandbox: boolean;

  @Column({ name: 'asaas_webhook_url', nullable: true })
  asaasWebhookUrl: string;

  @Column({ name: 'asaas_webhook_id', nullable: true })
  asaasWebhookId: string;

  @Column({ name: 'asaas_webhook_auth_token', nullable: true })
  asaasWebhookAuthToken: string;
}
