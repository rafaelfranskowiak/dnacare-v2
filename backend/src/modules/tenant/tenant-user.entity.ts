import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('tenant_users')
@Index('UQ_tenant_users_tenant_user', ['tenantId', 'userId'], { unique: true })
export class TenantUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'role_id', nullable: true })
  roleId: string;

  @Column({ name: 'team_id', type: 'varchar', nullable: true })
  teamId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  role: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
