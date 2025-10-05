import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SupabaseService, SupabaseUserTransactionRecord } from '../auth/supabase.service';
import type { DashboardConfig, DemoConfig } from '../config/configuration';
import {
  DashboardGranularity,
  DashboardSummaryQueryDto,
} from './dto/dashboard-summary-query.dto';

export interface DashboardTotals {
  inflow: number;
  outflow: number;
  net: number;
  currency: string;
}

export interface DashboardCategoryAggregate {
  category: string;
  total: number;
  percentage: number;
}

export interface DashboardAccountAggregate {
  accountId: string;
  name: string | null;
  institution: string | null;
  currency: string | null;
  inflow: number;
  outflow: number;
  closingBalance: number | null;
}

export interface DashboardTimelinePoint {
  period: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface DashboardSummaryResponse {
  totals: DashboardTotals;
  categories: DashboardCategoryAggregate[];
  accounts: DashboardAccountAggregate[];
  timeline: DashboardTimelinePoint[];
  granularity: DashboardGranularity;
  range: {
    start: string | null;
    end: string | null;
  };
}

interface FilteredTransactionsResult {
  transactions: SupabaseUserTransactionRecord[];
  startDate: Date | null;
  endDate: Date | null;
}

const UNCATEGORIZED_LABEL = 'Sin categoría';
const OTHER_CATEGORIES_LABEL = 'Otros';

@Injectable()
export class DashboardService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async getSummary(query: DashboardSummaryQueryDto): Promise<DashboardSummaryResponse> {
    const dashboardConfig = this.configService.get<DashboardConfig>('dashboard', { infer: true });
    const demoConfig = this.configService.get<DemoConfig>('demo', { infer: true });

    const granularity = query.granularity ?? dashboardConfig?.defaultGranularity ?? DashboardGranularity.MONTH;
    const { transactions, startDate, endDate } = await this.filterTransactions(query, dashboardConfig);

    const currency =
      query.currency ??
      transactions.find((tx) => tx.currency)?.currency ??
      transactions.find((tx) => tx.account?.currency)?.account?.currency ??
      demoConfig?.defaultCurrency ??
      'CLP';

    const totals = this.computeTotals(transactions, currency);
    const categories = this.aggregateCategories(transactions, totals, query.maxCategories);
    const accounts = await this.aggregateAccounts(query.userId, transactions, query.accountId);
    const timeline = this.buildTimeline(transactions, granularity);

    return {
      totals,
      categories,
      accounts,
      timeline,
      granularity,
      range: {
        start: startDate ? startDate.toISOString() : null,
        end: endDate ? endDate.toISOString() : null,
      },
    };
  }

  private async filterTransactions(
    query: DashboardSummaryQueryDto,
    config?: DashboardConfig,
  ): Promise<FilteredTransactionsResult> {
    const transactions = await this.supabaseService.listUserTransactions(query.userId);

    let startDate: Date | null = query.startDate ? new Date(query.startDate) : null;
    let endDate: Date | null = query.endDate ? new Date(query.endDate) : null;

    if (startDate && Number.isNaN(startDate.valueOf())) {
      throw new BadRequestException('startDate must be a valid ISO 8601 date');
    }

    if (endDate && Number.isNaN(endDate.valueOf())) {
      throw new BadRequestException('endDate must be a valid ISO 8601 date');
    }

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    const maxRangeInDays = config?.maxRangeInDays ?? 365;
    if (startDate && endDate) {
      const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffInDays > maxRangeInDays) {
        throw new BadRequestException(`Date range cannot exceed ${maxRangeInDays} days`);
      }
    }

    const filtered = transactions.filter((transaction) => {
      if (query.accountId) {
        const statement = transaction.statement;
        if (!statement || statement.account_id !== query.accountId) {
          return false;
        }
      }

      if (!transaction.posted_at) {
        return true;
      }

      const postedAt = new Date(transaction.posted_at);
      if (Number.isNaN(postedAt.valueOf())) {
        return true;
      }

      if (startDate && postedAt < startDate) {
        return false;
      }

      if (endDate && postedAt > endDate) {
        return false;
      }

      return true;
    });

    if (!startDate && filtered.length > 0) {
      startDate = this.safeMinDate(filtered);
    }

    if (!endDate && filtered.length > 0) {
      endDate = this.safeMaxDate(filtered);
    }

    return { transactions: filtered, startDate, endDate };
  }

  private computeTotals(transactions: SupabaseUserTransactionRecord[], currency: string): DashboardTotals {
    return transactions.reduce(
      (totals, transaction) => {
        const amount = transaction.amount ?? 0;
        if (amount >= 0) {
          totals.inflow += amount;
        } else {
          totals.outflow += Math.abs(amount);
        }
        totals.net = totals.inflow - totals.outflow;
        return totals;
      },
      { inflow: 0, outflow: 0, net: 0, currency } satisfies DashboardTotals,
    );
  }

  private aggregateCategories(
    transactions: SupabaseUserTransactionRecord[],
    totals: DashboardTotals,
    maxCategories?: number,
  ): DashboardCategoryAggregate[] {
    const categoryTotals = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.amount === null || transaction.amount === undefined) {
        continue;
      }

      const key = (transaction.category ?? UNCATEGORIZED_LABEL).trim() || UNCATEGORIZED_LABEL;
      const amount = Math.abs(transaction.amount);
      categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + amount);
    }

    const overall = Array.from(categoryTotals.entries())
      .map<DashboardCategoryAggregate>(([category, total]) => ({
        category,
        total,
        percentage: this.safePercentage(total, totals.inflow + totals.outflow),
      }))
      .sort((a, b) => b.total - a.total);

    if (maxCategories && maxCategories > 0 && overall.length > maxCategories) {
      const keep = Math.max(1, maxCategories - 1);
      const primary = overall.slice(0, keep);
      const remainder = overall.slice(keep);
      const remainderTotal = remainder.reduce((sum, item) => sum + item.total, 0);

      return [
        ...primary,
        {
          category: OTHER_CATEGORIES_LABEL,
          total: remainderTotal,
          percentage: this.safePercentage(remainderTotal, totals.inflow + totals.outflow),
        },
      ];
    }

    return overall;
  }

  private async aggregateAccounts(
    userId: string,
    transactions: SupabaseUserTransactionRecord[],
    accountId?: string,
  ): Promise<DashboardAccountAggregate[]> {
    const statements = await this.supabaseService.listStatements(userId);
    const accountGroups = new Map<string, DashboardAccountAggregate>();

    const relevantStatements = accountId
      ? statements.filter((statement) => statement.account_id === accountId)
      : statements;

    for (const transaction of transactions) {
      const statement = transaction.statement;
      if (!statement) {
        continue;
      }
      const account = statement.account ?? null;
      const key = statement.account_id;
      if (!accountGroups.has(key)) {
        accountGroups.set(key, {
          accountId: key,
          name: account?.name ?? null,
          institution: account?.institution ?? null,
          currency: account?.currency ?? null,
          inflow: 0,
          outflow: 0,
          closingBalance: null,
        });
      }

      const aggregate = accountGroups.get(key)!;
      const amount = transaction.amount ?? 0;
      if (amount >= 0) {
        aggregate.inflow += amount;
      } else {
        aggregate.outflow += Math.abs(amount);
      }
    }

    for (const statement of relevantStatements) {
      const key = statement.account_id;
      const aggregate = accountGroups.get(key);
      if (!aggregate) {
        accountGroups.set(key, {
          accountId: key,
          name: statement.account?.name ?? null,
          institution: statement.account?.institution ?? null,
          currency: statement.account?.currency ?? null,
          inflow: 0,
          outflow: 0,
          closingBalance: statement.closing_balance ?? null,
        });
        continue;
      }

      if (statement.closing_balance !== null && statement.closing_balance !== undefined) {
        aggregate.closingBalance = statement.closing_balance;
      }

      aggregate.currency = aggregate.currency ?? statement.account?.currency ?? null;
      aggregate.name = aggregate.name ?? statement.account?.name ?? null;
      aggregate.institution = aggregate.institution ?? statement.account?.institution ?? null;
    }

    return Array.from(accountGroups.values()).sort((a, b) => b.inflow + b.outflow - (a.inflow + a.outflow));
  }

  private buildTimeline(
    transactions: SupabaseUserTransactionRecord[],
    granularity: DashboardGranularity,
  ): DashboardTimelinePoint[] {
    const buckets = new Map<string, DashboardTimelinePoint>();

    for (const transaction of transactions) {
      if (!transaction.posted_at) {
        continue;
      }

      const date = new Date(transaction.posted_at);
      if (Number.isNaN(date.valueOf())) {
        continue;
      }

      const period = this.formatPeriod(date, granularity);
      if (!buckets.has(period)) {
        buckets.set(period, { period, inflow: 0, outflow: 0, net: 0 });
      }

      const bucket = buckets.get(period)!;
      const amount = transaction.amount ?? 0;
      if (amount >= 0) {
        bucket.inflow += amount;
      } else {
        bucket.outflow += Math.abs(amount);
      }
      bucket.net = bucket.inflow - bucket.outflow;
    }

    return Array.from(buckets.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  private formatPeriod(date: Date, granularity: DashboardGranularity): string {
    switch (granularity) {
      case DashboardGranularity.DAY:
        return date.toISOString().slice(0, 10);
      case DashboardGranularity.WEEK: {
        const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const day = target.getUTCDay() || 7;
        target.setUTCDate(target.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return `${target.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
      }
      case DashboardGranularity.MONTH:
      default:
        return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    }
  }

  private safePercentage(value: number, total: number): number {
    if (!total || Number.isNaN(total) || total === 0) {
      return 0;
    }

    return Math.round((value / total) * 1000) / 10;
  }

  private safeMinDate(transactions: SupabaseUserTransactionRecord[]): Date | null {
    const dates = transactions
      .map((tx) => (tx.posted_at ? new Date(tx.posted_at) : null))
      .filter((date): date is Date => Boolean(date) && !Number.isNaN(date!.valueOf()));

    if (dates.length === 0) {
      return null;
    }

    return new Date(Math.min(...dates.map((date) => date.getTime())));
  }

  private safeMaxDate(transactions: SupabaseUserTransactionRecord[]): Date | null {
    const dates = transactions
      .map((tx) => (tx.posted_at ? new Date(tx.posted_at) : null))
      .filter((date): date is Date => Boolean(date) && !Number.isNaN(date!.valueOf()));

    if (dates.length === 0) {
      return null;
    }

    return new Date(Math.max(...dates.map((date) => date.getTime())));
  }
}
