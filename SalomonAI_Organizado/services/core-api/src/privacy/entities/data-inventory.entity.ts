import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum DataInventoryStatus {
  ACTIVE = 'active',
  ANONYMIZED = 'anonymized',
  PURGED = 'purged',
}

@Entity({ name: 'privacy_data_inventory' })
export class DataInventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_privacy_data_subject')
  @Column({ name: 'data_subject_id', type: 'varchar', length: 120 })
  dataSubjectId!: string;

  @Column({ name: 'data_category', type: 'varchar', length: 120 })
  dataCategory!: string;

  @Column({ name: 'source_system', type: 'varchar', length: 120, nullable: true })
  sourceSystem?: string | null;

  @Column({ name: 'collected_at', type: 'timestamptz' })
  collectedAt!: Date;

  @Column({ name: 'retention_period_days', type: 'int' })
  retentionPeriodDays!: number;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ type: 'enum', enum: DataInventoryStatus, default: DataInventoryStatus.ACTIVE })
  status!: DataInventoryStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
