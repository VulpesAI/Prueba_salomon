import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum DsarRequestType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
}

export enum DsarRequestStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

@Entity({ name: 'privacy_dsar_requests' })
export class DsarRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_privacy_dsar_user')
  @Column({ name: 'user_id', type: 'varchar', length: 120 })
  userId!: string;

  @Column({ type: 'enum', enum: DsarRequestType })
  type!: DsarRequestType;

  @Column({ type: 'enum', enum: DsarRequestStatus, default: DsarRequestStatus.OPEN })
  status!: DsarRequestStatus;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload?: Record<string, any> | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string | null;

  @Column({ name: 'requested_by', type: 'varchar', length: 120, nullable: true })
  requestedBy?: string | null;

  @Column({ name: 'completed_by', type: 'varchar', length: 120, nullable: true })
  completedBy?: string | null;

  @CreateDateColumn({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
