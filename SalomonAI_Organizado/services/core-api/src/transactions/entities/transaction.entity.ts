import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FinancialAccount } from './financial-account.entity';

@Entity('transactions')
@Index(['userId', 'date'])
@Index(['accountId', 'date'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'varchar', length: 50 })
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, user => user.transactions)
  user: User;

  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => FinancialAccount, account => account.transactions)
  account: FinancialAccount;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  externalId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}