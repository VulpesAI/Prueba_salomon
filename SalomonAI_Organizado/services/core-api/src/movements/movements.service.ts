import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  SupabaseMovementsStatsResult,
  SupabaseService,
  SupabaseTransactionsQueryOptions,
  SupabaseTransactionSortField,
  SupabaseUserTransactionRecord,
} from '../auth/supabase.service';
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

    const sortField: SupabaseTransactionSortField =
      query.sortBy === MovementSortField.AMOUNT ? 'amount' : 'posted_at';
    const sortDirection: 'asc' | 'desc' =
      query.sortDirection === MovementSortDirection.ASC ? 'asc' : 'desc';
    const typeFilter =
      query.type === MovementTypeFilter.INFLOW
        ? 'inflow'
        : query.type === MovementTypeFilter.OUTFLOW
          ? 'outflow'
          : undefined;

    const queryOptions: SupabaseTransactionsQueryOptions = {
      userId: query.userId,
      page,
      pageSize,
      accountId: query.accountId,
      statementId: query.statementId,
      category: query.category,
      merchant: query.merchant,
      search: query.search,
      minAmount: query.minAmount,
      maxAmount: query.maxAmount,
      startDate: query.startDate,
      endDate: query.endDate,
      type: typeFilter,
      sortBy: sortField,
      sortDirection,
    };

    const [listResult, statsResult] = await Promise.all([
      this.supabaseService.queryUserTransactions(queryOptions),
      this.supabaseService.getMovementsStats(queryOptions),
    ]);

    const total = listResult.total;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const data = listResult.data.map((transaction) => this.toContract(transaction));
    const stats = this.toStats(statsResult);

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
      data,
      stats,
    };
  }

  private toStats(stats: SupabaseMovementsStatsResult): MovementsStatsContract {
    return {
      count: stats.count,
      totalAmount: stats.totalAmount,
      inflow: stats.inflow,
      outflow: stats.outflow,
      averageAmount: stats.averageAmount,
    };
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
}
