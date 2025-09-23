import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { FinancialAccount } from './entities/financial-account.entity';
import { ClassificationService } from '../classification/classification.service';

interface CreateTransactionDto {
  amount: number;
  description: string;
  date: Date;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  accountId: string;
  userId: string;
  metadata?: Record<string, any>;
  externalId?: string;
}

interface UpdateTransactionDto {
  amount?: number;
  description?: string;
  category?: string;
  date?: Date;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  metadata?: Record<string, any>;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category?: string;
  accountId?: string;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(FinancialAccount)
    private accountRepository: Repository<FinancialAccount>,
    private classificationService: ClassificationService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const account = await this.accountRepository.findOne({
      where: { id: createTransactionDto.accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.userId !== createTransactionDto.userId) {
      throw new BadRequestException('Account does not belong to user');
    }

    // Clasificar la transacción
    const classificationResult = await this.classificationService.classifyTransaction({
      description: createTransactionDto.description,
    });

    const transaction = this.transactionRepository.create({
      ...createTransactionDto,
      category: classificationResult.category,
      status: 'COMPLETED',
    });

    await this.transactionRepository.save(transaction);

    // Actualizar el balance de la cuenta
    const amountChange = createTransactionDto.type === 'EXPENSE' ? -createTransactionDto.amount : createTransactionDto.amount;
    await this.accountRepository.update(account.id, {
      balance: account.balance + amountChange,
    });

    return transaction;
  }

  async findAll(userId: string, filters: TransactionFilters = {}): Promise<Transaction[]> {
    const where: FindOptionsWhere<Transaction> = { userId };

    if (filters.startDate && filters.endDate) {
      where.date = Between(filters.startDate, filters.endDate);
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.accountId) {
      where.accountId = filters.accountId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    return this.transactionRepository.find({
      where,
      order: { date: 'DESC' },
      relations: ['account'],
    });
  }

  async update(id: string, userId: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
      relations: ['account'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Si se está actualizando la descripción, reclasificar
    if (updateTransactionDto.description) {
      const classificationResult = await this.classificationService.classifyTransaction({
        description: updateTransactionDto.description,
      });
      updateTransactionDto.category = classificationResult.category;
    }

    // Si se está actualizando el monto, actualizar el balance de la cuenta
    if (updateTransactionDto.amount !== undefined) {
      const amountDifference = 
        (transaction.type === 'EXPENSE' ? -1 : 1) * 
        (updateTransactionDto.amount - transaction.amount);
      
      await this.accountRepository.update(transaction.accountId, {
        balance: () => `balance + ${amountDifference}`,
      });
    }

    Object.assign(transaction, updateTransactionDto);
    return this.transactionRepository.save(transaction);
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Revertir el efecto en el balance de la cuenta
    const amountChange = transaction.type === 'EXPENSE' ? transaction.amount : -transaction.amount;
    await this.accountRepository.update(transaction.accountId, {
      balance: () => `balance + ${amountChange}`,
    });

    await this.transactionRepository.remove(transaction);
  }

  async getStatistics(userId: string, startDate: Date, endDate: Date) {
    const transactions = await this.transactionRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
    });

    const stats = {
      totalIncome: 0,
      totalExpense: 0,
      byCategory: {} as Record<string, number>,
    };

    for (const transaction of transactions) {
      if (transaction.type === 'INCOME') {
        stats.totalIncome += transaction.amount;
      } else if (transaction.type === 'EXPENSE') {
        stats.totalExpense += transaction.amount;
        stats.byCategory[transaction.category] = 
          (stats.byCategory[transaction.category] || 0) + transaction.amount;
      }
    }

    return stats;
  }
}