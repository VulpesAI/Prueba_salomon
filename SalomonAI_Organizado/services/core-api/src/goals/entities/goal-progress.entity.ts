import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FinancialGoal } from './financial-goal.entity';

@Entity('goal_progress')
@Index(['goalId', 'recordedAt'])
export class GoalProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'goal_id' })
  goalId: string;

  @ManyToOne(() => FinancialGoal, goal => goal.progressEntries, { onDelete: 'CASCADE' })
  goal: FinancialGoal;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'actual_amount' })
  actualAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'expected_amount', nullable: true })
  expectedAmount?: number | null;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'timestamptz', name: 'recorded_at', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
