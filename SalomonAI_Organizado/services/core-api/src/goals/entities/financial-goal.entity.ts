import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GoalProgress } from './goal-progress.entity';

export const GOAL_STATUS_VALUES = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const;
export type GoalStatus = (typeof GOAL_STATUS_VALUES)[number];

@Entity('financial_goals')
@Index(['userId', 'status'])
export class FinancialGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, user => user.goals, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'target_amount' })
  targetAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'initial_amount',
    default: 0,
  })
  initialAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'expected_monthly_contribution',
    nullable: true,
  })
  expectedMonthlyContribution?: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    name: 'deviation_threshold',
    default: 0.15,
  })
  deviationThreshold: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: GoalStatus;

  @Column({ type: 'timestamptz', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamptz', name: 'target_date' })
  targetDate: Date;

  @OneToMany(() => GoalProgress, progress => progress.goal)
  progressEntries: GoalProgress[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
