import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SyncRequestStatus =
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED';

export const SYNC_REQUEST_STATUSES: SyncRequestStatus[] = [
  'QUEUED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
];

@Entity('sync_requests')
@Index(['clientRequestId'], { unique: true })
@Index(['status', 'scheduledAt'])
export class SyncRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'client_request_id' })
  clientRequestId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  endpoint: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'varchar', length: 20, default: 'QUEUED' })
  status: SyncRequestStatus;

  @Column({ type: 'int', default: 0, name: 'attempt_count' })
  attemptCount: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'scheduled_at' })
  scheduledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_attempt_at' })
  lastAttemptAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'processed_at' })
  processedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
