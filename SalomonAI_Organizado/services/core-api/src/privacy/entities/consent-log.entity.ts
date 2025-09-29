import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'privacy_consent_logs' })
export class ConsentLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_privacy_consent_user')
  @Column({ name: 'user_id', type: 'varchar', length: 120 })
  userId!: string;

  @Column({ name: 'consent_type', type: 'varchar', length: 120 })
  consentType!: string;

  @Column({ name: 'granted', type: 'boolean', default: true })
  granted!: boolean;

  @Column({ name: 'version', type: 'varchar', length: 50, nullable: true })
  version?: string | null;

  @Column({ name: 'channel', type: 'varchar', length: 80, nullable: true })
  channel?: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
