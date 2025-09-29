import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'privacy_audit_logs' })
export class PrivacyAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  action!: string;

  @Column({ type: 'varchar', length: 120 })
  actor!: string;

  @Column({ name: 'actor_role', type: 'varchar', length: 80, default: 'system' })
  actorRole!: string;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
