import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('financial_forecasts')
@Index(['user', 'forecastDate'])
export class FinancialForecast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'forecast_date', type: 'date', nullable: false })
  forecastDate: Date;

  @Column({ name: 'predicted_value', type: 'decimal', precision: 14, scale: 2, nullable: false })
  predictedValue: number;

  @Column({ name: 'model_type', type: 'varchar', length: 20, default: 'auto' })
  modelType: string;

  @Column({ name: 'horizon_days', type: 'int', default: 30 })
  horizonDays: number;

  @Column({ name: 'generated_at', type: 'timestamptz', nullable: false })
  generatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
