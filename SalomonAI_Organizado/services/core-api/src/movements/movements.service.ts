import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SupabaseService, SupabaseUserTransactionRecord } from '../auth/supabase.service';
import type { MovementsConfig } from '../config/configuration';
import {
  GetMovementsQueryDto,
  MovementSortDirection,
  MovementSortField,
  MovementTypeFilter,
} from './dto/get-movements-query.dto';

export interface MovementAccountContract {
  id: string;
  externalId: string | null;
  name: string | null;
  institution: string | null;
  type: string | null;
  currency: string | null;
}

export interface MovementContract {
  id: string;
  statementId: string;
  postedAt: string | null;
  description: string | null;
  amount: number | null;
  currency: string | null;
  merchant: string | null;
  category: string | null;
  type: 'credit' | 'debit' | 'unknown';
  account: MovementAccountContract | null;
  metadata: Record<string, unknown> | null;
  conversational: {
    direction: 'inflow' | 'outflow' | 'unknown';
    absoluteAmount: number | null;
    summary: string;
  };
}

export interface MovementsStatsContract {
  count: number;
  totalAmount: number;
  inflow: number;
  outflow: number;
  averageAmount: number;
}

export interface MovementsResponse {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: Partial<GetMovementsQueryDto>;
  data: MovementContract[];
  stats: MovementsStatsContract;
}

@Injectable()
export class MovementsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async listMovements(query: GetMovementsQueryDto): Promise<MovementsResponse> {
    const config = this.configService.get<MovementsConfig>('movements', { infer: true });
    const resolvedPageSize = Number(query.pageSize ?? config?.defaultPageSize ?? 25);
    const maxPageSize = Number(config?.maxPageSize ?? 200);
    const pageSize = Math.min(
      Number.isFinite(resolvedPageSize) ? resolvedPageSize : 25,
      maxPageSize,
    );
    const resolvedPage = Number(query.page ?? 1);
    const page = Number.isFinite(resolvedPage) && resolvedPage > 0 ? resolvedPage : 1;

    const transactions = await this.supabaseService.listUserTransactions(query.userId);
    const filtered = this.applyFilters(transactions, query);
    const sorted = this.sortTransactions(filtered, query.sortBy, query.sortDirection);

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const offset = (page - 1) * pageSize;
    const pageItems = sorted
      .slice(offset, offset + pageSize)
      .map((transaction) => this.toContract(transaction));

    const stats = this.computeStats(filtered);

    return {
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      filters: {
        ...query,
        page,
        pageSize,
      },
      data: pageItems,
      stats,
    };
  }

  private applyFilters(
    transactions: SupabaseUserTransactionRecord[],
    query: GetMovementsQueryDto,
  ): SupabaseUserTransactionRecord[] {
    return transactions.filter((transaction) => {
      if (query.accountId) {
        const statement = transaction.statement;
        if (!statement || statement.account_id !== query.accountId) {
          return false;
        }
      }

      if (query.statementId && transaction.statement_id !== query.statementId) {
        return false;
      }

      if (query.category) {
        const normalizedCategory = (transaction.category ?? '').toLowerCase();
        if (!normalizedCategory.includes(query.category.toLowerCase())) {
          return false;
        }
      }

      if (query.merchant) {
        const merchant = (transaction.merchant ?? '').toLowerCase();
        if (!merchant.includes(query.merchant.toLowerCase())) {
          return false;
        }
      }

      if (query.search) {
        const search = query.search.toLowerCase();
        const haystack = [
          transaction.description,
          transaction.raw_description,
          transaction.normalized_description,
          transaction.merchant,
          transaction.category,
        ]
          .filter(Boolean)
          .map((value) => value!.toString().toLowerCase());

        if (!haystack.some((value) => value.includes(search))) {
          return false;
        }
      }

      if (query.minAmount !== undefined && query.minAmount !== null) {
        if ((transaction.amount ?? 0) < query.minAmount) {
          return false;
        }
      }

      if (query.maxAmount !== undefined && query.maxAmount !== null) {
        if ((transaction.amount ?? 0) > query.maxAmount) {
          return false;
        }
      }

      if (query.startDate || query.endDate) {
        const postedAt = transaction.posted_at ? new Date(transaction.posted_at) : null;
        if (query.startDate) {
          const start = new Date(query.startDate);
          if (postedAt && postedAt < start) {
            return false;
          }
        }
        if (query.endDate) {
          const end = new Date(query.endDate);
          if (postedAt && postedAt > end) {
            return false;
          }
        }
      }

      if (query.type) {
        const amount = transaction.amount ?? 0;
        if (query.type === MovementTypeFilter.INFLOW && amount < 0) {
          return false;
        }
        if (query.type === MovementTypeFilter.OUTFLOW && amount >= 0) {
          return false;
        }
      }

      return true;
    });
  }

  private sortTransactions(
    transactions: SupabaseUserTransactionRecord[],
    sortBy?: MovementSortField,
    direction: MovementSortDirection = MovementSortDirection.DESC,
  ): SupabaseUserTransactionRecord[] {
    const sortField = sortBy ?? MovementSortField.POSTED_AT;
    const factor = direction === MovementSortDirection.ASC ? 1 : -1;

    return [...transactions].sort((a, b) => {
      if (sortField === MovementSortField.AMOUNT) {
        const left = a.amount ?? 0;
        const right = b.amount ?? 0;
        if (left === right) {
          return 0;
        }
        return left > right ? factor : -factor;
      }

      const leftDate = a.posted_at ? new Date(a.posted_at).getTime() : 0;
      const rightDate = b.posted_at ? new Date(b.posted_at).getTime() : 0;
      if (leftDate === rightDate) {
        return 0;
      }
      return leftDate > rightDate ? factor : -factor;
    });
  }

  private toContract(transaction: SupabaseUserTransactionRecord): MovementContract {
    const amount = transaction.amount ?? null;
    const direction = amount === null ? 'unknown' : amount >= 0 ? 'inflow' : 'outflow';
    const absoluteAmount = amount === null ? null : Math.abs(amount);
    const statement = transaction.statement;
    const accountRecord = statement?.account ?? transaction.account ?? null;

    return {
      id: transaction.id,
      statementId: statement?.id ?? transaction.statement_id,
      postedAt: transaction.posted_at ?? statement?.processed_at ?? null,
      description:
        transaction.description ??
        transaction.normalized_description ??
        transaction.raw_description ??
        null,
      amount,
      currency:
        transaction.currency ?? accountRecord?.currency ?? statement?.account?.currency ?? null,
      merchant: transaction.merchant ?? null,
      category: transaction.category ?? null,
      type: amount === null ? 'unknown' : amount >= 0 ? 'credit' : 'debit',
      account: accountRecord
        ? {
            id: accountRecord.id,
            externalId: accountRecord.external_id,
            name: accountRecord.name ?? null,
            institution: accountRecord.institution ?? null,
            type: accountRecord.type ?? null,
            currency: accountRecord.currency ?? null,
          }
        : null,
      metadata: transaction.metadata ?? null,
      conversational: {
        direction,
        absoluteAmount,
        summary: this.buildConversationalSummary(transaction, direction, absoluteAmount),
      },
    };
  }

  private buildConversationalSummary(
    transaction: SupabaseUserTransactionRecord,
    direction: 'inflow' | 'outflow' | 'unknown',
    absoluteAmount: number | null,
  ): string {
    const parts: string[] = [];
    if (direction !== 'unknown' && absoluteAmount !== null) {
      const directionLabel = direction === 'inflow' ? 'Ingreso' : 'Gasto';
      parts.push(`${directionLabel} de ${absoluteAmount.toFixed(2)}`);
    }

    if (transaction.description) {
      parts.push(`Descripción: ${transaction.description}`);
    } else if (transaction.normalized_description) {
      parts.push(`Concepto: ${transaction.normalized_description}`);
    }

    if (transaction.merchant) {
      parts.push(`Comercio: ${transaction.merchant}`);
    }

    if (transaction.category) {
      parts.push(`Categoría: ${transaction.category}`);
    }

    return parts.join(' | ') || 'Movimiento registrado';
  }

  private computeStats(transactions: SupabaseUserTransactionRecord[]): MovementsStatsContract {
    if (transactions.length === 0) {
      return {
        count: 0,
        totalAmount: 0,
        inflow: 0,
        outflow: 0,
        averageAmount: 0,
      };
    }

    return transactions.reduce<MovementsStatsContract>(
      (stats, transaction, _, { length }) => {
        const amount = transaction.amount ?? 0;
        stats.totalAmount += amount;
        if (amount >= 0) {
          stats.inflow += amount;
        } else {
          stats.outflow += Math.abs(amount);
        }
        stats.count += 1;
        stats.averageAmount = stats.totalAmount / length;
        return stats;
      },
      { count: 0, totalAmount: 0, inflow: 0, outflow: 0, averageAmount: 0 },
    );
  }
}
