import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ClassificationLabelSource {
  USER_CORRECTION = 'USER_CORRECTION',
  MANUAL_TRAINING = 'MANUAL_TRAINING',
  SYSTEM_IMPORT = 'SYSTEM_IMPORT',
}

export enum ClassificationLabelStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  USED = 'USED',
}

@Entity('classification_labels')
export class ClassificationLabel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ name: 'final_category', type: 'varchar', length: 100 })
  finalCategory: string;

  @Column({ name: 'previous_category', type: 'varchar', length: 100, nullable: true })
  previousCategory?: string;

  @Column({ name: 'movement_id', type: 'uuid', nullable: true })
  movementId?: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: ClassificationLabelSource.USER_CORRECTION })
  source: ClassificationLabelSource;

  @Column({ type: 'varchar', length: 40, default: ClassificationLabelStatus.PENDING })
  status: ClassificationLabelStatus;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date;
}
