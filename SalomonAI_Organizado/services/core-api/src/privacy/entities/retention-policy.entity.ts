import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum RetentionPolicyAction {
  ANONYMIZE = 'anonymize',
  DELETE = 'delete',
}

@Entity({ name: 'privacy_retention_policies' })
export class RetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'data_category', type: 'varchar', length: 120, unique: true })
  dataCategory!: string;

  @Column({ name: 'retention_period_days', type: 'int' })
  retentionPeriodDays!: number;

  @Column({ name: 'grace_period_days', type: 'int', default: 0 })
  gracePeriodDays!: number;

  @Column({ type: 'enum', enum: RetentionPolicyAction, default: RetentionPolicyAction.ANONYMIZE })
  action!: RetentionPolicyAction;

  @Column({ name: 'legal_basis', type: 'text', nullable: true })
  legalBasis?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
