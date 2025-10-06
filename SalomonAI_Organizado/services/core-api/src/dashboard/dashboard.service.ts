import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  SupabaseForecastResultRecord,
  SupabaseService,
  SupabaseStatementRecord,
  SupabaseUserTransactionRecord,
} from '../auth/supabase.service';
import type { DashboardConfig, DemoConfig, ForecastingConfig } from '../config/configuration';
import { DashboardResumenQueryDto } from './dto/dashboard-resumen-query.dto';
import { DashboardGranularity, DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';
import { DashboardProjectionQueryDto } from './dto/dashboard-projection-query.dto';
import { DashboardRecommendationsQueryDto } from './dto/dashboard-recommendations-query.dto';
import { DashboardRecommendationFeedbackDto } from './dto/dashboard-recommendation-feedback.dto';
import { DashboardForecastingGatewayService } from './forecasting-gateway.service';
import { DashboardRecommendationsGatewayService } from './recommendations-gateway.service';

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

export interface DashboardAccountBalanceSnapshot {
  accountId: string;
  name: string | null;
  institution: string | null;
  currency: string | null;
  balance: number | null;
  lastUpdatedAt: string | null;
}

export interface DashboardSaldoActual {
  total: number;
  currency: string;
  accounts: DashboardAccountBalanceSnapshot[];
}

export interface DashboardSpendingPeriod {
  total: number;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  categories: DashboardCategoryAggregate[];
}

export interface DashboardProjectionPoint {
  date: string;
  amount: number;
}

export interface DashboardProjectionSummary {
  horizonDays: number;
  total: number;
  averageDaily: number;
  currency: string;
  generatedAt: string;
  source: 'forecasting' | 'historical';
  metadata: Record<string, unknown> | null;
  points: DashboardProjectionPoint[];
}

export interface DashboardResumenResponse {
  saldoActual: DashboardSaldoActual;
  gastosDelPeriodo: DashboardSpendingPeriod;
  categoriaPrincipal: DashboardCategoryAggregate | null;
  proyeccion: DashboardProjectionSummary | null;
}

interface FilteredTransactionsResult {
  transactions: SupabaseUserTransactionRecord[];
  startDate: Date | null;
  endDate: Date | null;
}

interface ProjectionSummaryOptions {
  userId: string;
  currency: string;
  requestedHorizonDays?: number;
  defaultHorizonDays?: number;
  transactions: SupabaseUserTransactionRecord[];
  referenceDate: Date;
}

interface StatementTimestamp {
  timestamp: number | null;
  iso: string | null;
}

const UNCATEGORIZED_LABEL = 'Sin categoría';
const OTHER_CATEGORIES_LABEL = 'Otros';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly forecastingGateway: DashboardForecastingGatewayService,
    private readonly recommendationsGateway: DashboardRecommendationsGatewayService,
  ) {}

  async getProjection(query: DashboardProjectionQueryDto) {
    return this.forecastingGateway.fetchForecast(query.userId, {
      horizonDays: query.horizonDays,
      model: query.model,
      refresh: query.refresh,
    });
  }

  async getRecommendations(query: DashboardRecommendationsQueryDto) {
    return this.recommendationsGateway.getRecommendations(query.userId, {
      refresh: query.refresh,
    });
  }

  async submitRecommendationFeedback(payload: DashboardRecommendationFeedbackDto) {
    return this.recommendationsGateway.submitFeedback(payload);
  }

  async getResumen(query: DashboardResumenQueryDto): Promise<DashboardResumenResponse> {
    const dashboardConfig = this.configService.get<DashboardConfig>('dashboard', { infer: true });
    const demoConfig = this.configService.get<DemoConfig>('demo', { infer: true });
    const forecastingConfig = this.configService.get<ForecastingConfig>('forecasting', {
      infer: true,
    });

    const statements = await this.supabaseService.listStatements(query.userId);
    const transactions = await this.supabaseService.listUserTransactions(query.userId);

    const relevantStatements = query.accountId
      ? statements.filter((statement) => statement.account_id === query.accountId)
      : statements;

    const relevantTransactions = query.accountId
      ? transactions.filter((transaction) => transaction.statement?.account_id === query.accountId)
      : transactions;

    const currency =
      query.currency ??
      relevantTransactions.find((tx) => tx.currency)?.currency ??
      relevantStatements.find((statement) => statement.account?.currency)?.account?.currency ??
      demoConfig?.defaultCurrency ??
      'CLP';

    const { startDate, endDate } = this.resolvePeriodRange(
      query.startDate,
      query.endDate,
      dashboardConfig,
    );

    const periodTransactions = relevantTransactions.filter((transaction) =>
      this.isTransactionWithinRange(transaction, startDate, endDate),
    );

    const spendingTransactions = periodTransactions.filter(
      (transaction) => (transaction.amount ?? 0) < 0,
    );

    const spendingTotals = this.computeTotals(spendingTransactions, currency);
    const categoryAggregates = this.aggregateCategories(spendingTransactions, spendingTotals);

    const accountSnapshots = this.computeAccountBalances(relevantStatements).map((snapshot) => ({
      ...snapshot,
      balance:
        snapshot.balance !== null && snapshot.balance !== undefined
          ? this.roundAmount(snapshot.balance)
          : null,
    }));

    const totalBalance = this.roundAmount(
      accountSnapshots.reduce((sum, account) => sum + (account.balance ?? 0), 0),
    );

    const spendingTotal = this.roundAmount(spendingTotals.outflow);

    const projection = await this.buildProjectionSummary({
      userId: query.userId,
      currency,
      requestedHorizonDays: query.projectionDays,
      defaultHorizonDays: forecastingConfig?.defaultHorizonDays,
      transactions: relevantTransactions,
      referenceDate: endDate,
    });

    return {
      saldoActual: {
        total: totalBalance,
        currency,
        accounts: accountSnapshots,
      },
      gastosDelPeriodo: {
        total: spendingTotal,
        currency,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        categories: categoryAggregates,
      },
      categoriaPrincipal: categoryAggregates[0] ?? null,
      proyeccion: projection,
    } satisfies DashboardResumenResponse;
  }

  async getSummary(query: DashboardSummaryQueryDto): Promise<DashboardSummaryResponse> {
    const dashboardConfig = this.configService.get<DashboardConfig>('dashboard', { infer: true });
    const demoConfig = this.configService.get<DemoConfig>('demo', { infer: true });

    const granularity =
      query.granularity ?? dashboardConfig?.defaultGranularity ?? DashboardGranularity.MONTH;
    const { transactions, startDate, endDate } = await this.filterTransactions(
      query,
      dashboardConfig,
    );

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
      const diffInDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
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

  private resolvePeriodRange(
    start?: string,
    end?: string,
    config?: DashboardConfig,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = start
      ? new Date(start)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endDate = end ? new Date(end) : now;

    if (Number.isNaN(startDate.valueOf())) {
      throw new BadRequestException('startDate must be a valid ISO 8601 date');
    }

    if (Number.isNaN(endDate.valueOf())) {
      throw new BadRequestException('endDate must be a valid ISO 8601 date');
    }

    if (startDate > endDate) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    const maxRangeInDays = config?.maxRangeInDays ?? 365;
    const diffInDays = Math.max(
      0,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    if (diffInDays > maxRangeInDays) {
      throw new BadRequestException(`Date range cannot exceed ${maxRangeInDays} days`);
    }

    return { startDate, endDate };
  }

  private isTransactionWithinRange(
    transaction: SupabaseUserTransactionRecord,
    startDate: Date,
    endDate: Date,
  ): boolean {
    if (!transaction.posted_at) {
      return false;
    }

    const postedAt = new Date(transaction.posted_at);
    if (Number.isNaN(postedAt.valueOf())) {
      return false;
    }

    return postedAt >= startDate && postedAt <= endDate;
  }

  private computeAccountBalances(
    statements: SupabaseStatementRecord[],
  ): DashboardAccountBalanceSnapshot[] {
    const groups = new Map<string, { snapshot: DashboardAccountBalanceSnapshot; sortKey: number }>();

    for (const statement of statements) {
      const accountId = statement.account_id;
      if (!accountId) {
        continue;
      }

      const closingBalance =
        statement.closing_balance !== undefined && statement.closing_balance !== null
          ? statement.closing_balance
          : null;
      const account = statement.account ?? null;
      const timestamp = this.resolveStatementTimestamp(statement);

      const candidate: DashboardAccountBalanceSnapshot = {
        accountId,
        name: account?.name ?? null,
        institution: account?.institution ?? null,
        currency: account?.currency ?? null,
        balance: closingBalance,
        lastUpdatedAt: timestamp.iso,
      };

      const current = groups.get(accountId);
      if (!current) {
        groups.set(accountId, {
          snapshot: candidate,
          sortKey: timestamp.timestamp ?? Number.MIN_SAFE_INTEGER,
        });
        continue;
      }

      const candidateKey = timestamp.timestamp ?? Number.MIN_SAFE_INTEGER;
      const shouldReplace =
        candidateKey > current.sortKey ||
        (current.snapshot.balance === null && candidate.balance !== null);

      if (shouldReplace) {
        current.snapshot = candidate;
        current.sortKey = candidateKey;
      } else {
        if (current.snapshot.balance === null && candidate.balance !== null) {
          current.snapshot.balance = candidate.balance;
        }
        if (!current.snapshot.lastUpdatedAt && candidate.lastUpdatedAt) {
          current.snapshot.lastUpdatedAt = candidate.lastUpdatedAt;
        }
        if (!current.snapshot.name && candidate.name) {
          current.snapshot.name = candidate.name;
        }
        if (!current.snapshot.institution && candidate.institution) {
          current.snapshot.institution = candidate.institution;
        }
        if (!current.snapshot.currency && candidate.currency) {
          current.snapshot.currency = candidate.currency;
        }
      }
    }

    return Array.from(groups.values())
      .map((entry) => entry.snapshot)
      .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));
  }

  private resolveStatementTimestamp(statement: SupabaseStatementRecord): StatementTimestamp {
    const candidates = [
      statement.processed_at,
      statement.statement_date,
      statement.period_end,
      statement.updated_at,
      statement.created_at,
    ];

    for (const value of candidates) {
      if (!value) {
        continue;
      }

      const date = new Date(value);
      if (Number.isNaN(date.valueOf())) {
        continue;
      }

      return { timestamp: date.getTime(), iso: date.toISOString() };
    }

    return { timestamp: null, iso: null };
  }

  private async buildProjectionSummary(
    options: ProjectionSummaryOptions,
  ): Promise<DashboardProjectionSummary | null> {
    const requestedHorizon = this.normalizeHorizonDays(options.requestedHorizonDays ?? null);
    const defaultHorizon = this.normalizeHorizonDays(options.defaultHorizonDays ?? null);

    let forecast: SupabaseForecastResultRecord | null = null;
    try {
      forecast = await this.supabaseService.getLatestForecastResult(options.userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Unable to retrieve forecast for user ${options.userId}: ${message}`);
    }

    if (forecast && forecast.points.length > 0) {
      const sanitizedPoints = forecast.points
        .filter((point) => point && typeof point.date === 'string')
        .map((point) => ({
          date: point.date,
          amount: Number(point.amount ?? 0),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (sanitizedPoints.length > 0) {
        const forecastHorizon = this.normalizeHorizonDays(forecast.horizonDays ?? null);
        const horizonToUse =
          requestedHorizon ??
          forecastHorizon ??
          defaultHorizon ??
          this.normalizeHorizonDays(sanitizedPoints.length) ??
          sanitizedPoints.length;

        const limitedPoints = sanitizedPoints.slice(0, Math.max(1, Math.min(horizonToUse, sanitizedPoints.length)));
        const total = this.roundAmount(
          limitedPoints.reduce((sum, point) => sum + point.amount, 0),
        );
        const averageDaily = this.roundAmount(total / limitedPoints.length);

        const metadata: Record<string, unknown> = {
          modelType: forecast.modelType,
          historyDays: forecast.historyDays,
          originalHorizonDays: forecast.horizonDays,
        };

        if (forecast.metadata) {
          metadata.details = forecast.metadata;
        }

        return {
          horizonDays: limitedPoints.length,
          total,
          averageDaily,
          currency: options.currency,
          generatedAt: new Date(forecast.generatedAt).toISOString(),
          source: 'forecasting',
          metadata,
          points: limitedPoints.map((point) => ({
            date: point.date,
            amount: this.roundAmount(point.amount),
          })),
        } satisfies DashboardProjectionSummary;
      }
    }

    const fallbackHorizon = requestedHorizon ?? defaultHorizon ?? 7;
    return this.buildHistoricalProjection(options, fallbackHorizon);
  }

  private buildHistoricalProjection(
    options: ProjectionSummaryOptions,
    horizonDays: number | null,
  ): DashboardProjectionSummary | null {
    const normalizedHorizon = this.normalizeHorizonDays(horizonDays ?? null);
    if (!normalizedHorizon) {
      return null;
    }

    if (options.transactions.length === 0) {
      return null;
    }

    const dailyTotals = new Map<string, number>();
    for (const transaction of options.transactions) {
      if (!transaction.posted_at) {
        continue;
      }

      const postedAt = new Date(transaction.posted_at);
      if (Number.isNaN(postedAt.valueOf())) {
        continue;
      }

      const key = postedAt.toISOString().slice(0, 10);
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + (transaction.amount ?? 0));
    }

    if (dailyTotals.size === 0) {
      return null;
    }

    const totalNet = Array.from(dailyTotals.values()).reduce((sum, value) => sum + value, 0);
    const averageNet = this.roundAmount(totalNet / dailyTotals.size);

    const points: DashboardProjectionPoint[] = [];
    for (let day = 1; day <= normalizedHorizon; day += 1) {
      const date = new Date(
        Date.UTC(
          options.referenceDate.getUTCFullYear(),
          options.referenceDate.getUTCMonth(),
          options.referenceDate.getUTCDate() + day,
        ),
      );
      points.push({ date: date.toISOString().slice(0, 10), amount: averageNet });
    }

    const total = this.roundAmount(points.reduce((sum, point) => sum + point.amount, 0));

    return {
      horizonDays: points.length,
      total,
      averageDaily: averageNet,
      currency: options.currency,
      generatedAt: new Date().toISOString(),
      source: 'historical',
      metadata: {
        basis: 'average-net',
        sampleSize: options.transactions.length,
        distinctDays: dailyTotals.size,
      },
      points,
    } satisfies DashboardProjectionSummary;
  }

  private normalizeHorizonDays(value: number | null | undefined): number | null {
    if (typeof value !== 'number') {
      return null;
    }

    const normalized = Math.floor(value);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return null;
    }

    return normalized;
  }

  private roundAmount(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private computeTotals(
    transactions: SupabaseUserTransactionRecord[],
    currency: string,
  ): DashboardTotals {
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

    return Array.from(accountGroups.values()).sort(
      (a, b) => b.inflow + b.outflow - (a.inflow + a.outflow),
    );
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
        const target = new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
        );
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
