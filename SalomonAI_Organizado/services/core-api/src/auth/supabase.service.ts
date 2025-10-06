import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { AuthUser } from '@supabase/supabase-js';

interface TransactionFilterQuery {
  eq(column: string, value: unknown): this;
  ilike(column: string, pattern: string): this;
  gte(column: string, value: unknown): this;
  lte(column: string, value: unknown): this;
  lt(column: string, value: unknown): this;
  or(
    filters: string,
    options?: {
      foreignTable?: string;
      referencedTable?: string;
    },
  ): this;
}

interface SupabaseAuthResponse {
  user: AuthUser | null;
}

export interface SupabaseStorageUploadResult {
  bucket: string;
  path: string;
}

export interface SupabaseAccountUpsert {
  id?: string;
  user_id: string;
  external_id: string;
  name?: string | null;
  type?: string | null;
  institution?: string | null;
  currency?: string | null;
}

export interface SupabaseAccountRecord extends SupabaseAccountUpsert {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SupabaseStatementInsert {
  id: string;
  user_id: string;
  account_id: string;
  storage_path: string;
  raw_filename: string;
  mime_type: string | null;
  size: number | null;
  status: string;
  processing_stage?: string | null;
  progress?: number | null;
  error_message?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  statement_date?: string | null;
  uploaded_at?: string | null;
  processed_at?: string | null;
  checksum?: string | null;
  content_hash?: string | null;
  totals_hash?: string | null;
  dedupe_hash?: string | null;
  total_debit?: number | null;
  total_credit?: number | null;
  transaction_count?: number | null;
  opening_balance?: number | null;
  closing_balance?: number | null;
}

export interface SupabaseStatementRecord extends SupabaseStatementInsert {
  created_at?: string | null;
  updated_at?: string | null;
  account?: SupabaseAccountRecord | null;
}

export interface SupabaseStatementUpdate
  extends Partial<Omit<SupabaseStatementInsert, 'id' | 'user_id' | 'account_id'>> {
  status?: string;
  progress?: number | null;
  processed_at?: string | null;
  error_message?: string | null;
}

export interface SupabaseTransactionRecord {
  id: string;
  statement_id: string;
  external_id: string;
  posted_at?: string | null;
  description?: string | null;
  raw_description?: string | null;
  normalized_description?: string | null;
  amount?: number | null;
  currency?: string | null;
  merchant?: string | null;
  category?: string | null;
  status?: string | null;
  checksum?: string | null;
  dedupe_hash?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SupabaseTransactionUpsert
  extends Partial<Omit<SupabaseTransactionRecord, 'statement_id' | 'id'>> {
  statement_id: string;
  id?: string;
}

export interface SupabaseUserTransactionRecord extends SupabaseTransactionRecord {
  statement: SupabaseStatementRecord | null;
  account: SupabaseAccountRecord | null;
}

export type SupabaseTransactionSortField = 'posted_at' | 'amount';
export type SupabaseTransactionSortDirection = 'asc' | 'desc';

export interface SupabaseTransactionsQueryOptions {
  userId: string;
  page: number;
  pageSize: number;
  accountId?: string;
  statementId?: string;
  category?: string;
  merchant?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  type?: 'inflow' | 'outflow';
  sortBy?: SupabaseTransactionSortField;
  sortDirection?: SupabaseTransactionSortDirection;
}

export interface SupabaseTransactionsQueryResult {
  data: SupabaseUserTransactionRecord[];
  total: number;
}

export interface SupabaseMovementsStatsResult {
  count: number;
  totalAmount: number;
  inflow: number;
  outflow: number;
  averageAmount: number;
}

export interface ParsedStatementSummary {
  openingBalance?: number | null;
  closingBalance?: number | null;
  totalCredit?: number | null;
  totalDebit?: number | null;
  transactionCount?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  statementDate?: string | null;
  checksum?: string | null;
}

export interface ParsedStatementTransactionPayload {
  id?: string;
  externalId?: string;
  postedAt?: string | null;
  description?: string | null;
  rawDescription?: string | null;
  normalizedDescription?: string | null;
  amount?: number | null;
  currency?: string | null;
  merchant?: string | null;
  category?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ParsedStatementResultPayload {
  statementId: string;
  userId: string;
  status: 'completed' | 'failed';
  error?: string | null;
  processedAt?: string | null;
  summary?: ParsedStatementSummary;
  transactions?: ParsedStatementTransactionPayload[];
}

export interface SupabaseForecastPointRecord {
  date: string;
  amount: number;
}

export interface SupabaseForecastResultRecord {
  id: string;
  userId: string;
  forecastType: string;
  generatedAt: string;
  horizonDays: number;
  historyDays: number;
  modelType: string;
  metadata: Record<string, unknown> | null;
  points: SupabaseForecastPointRecord[];
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient | null;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');

    if (!url || !serviceRoleKey) {
      this.logger.warn('Supabase credentials are not fully configured.');
      this.client = null;
      return;
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  getClientOrThrow(): SupabaseClient {
    if (!this.client) {
      this.logger.warn('Supabase client is not configured.');
      throw new ServiceUnavailableException('Supabase is not configured');
    }

    return this.client;
  }

  async getUser(accessToken: string): Promise<AuthUser | null> {
    if (!this.client) {
      this.logger.warn('Supabase client is not configured.');
      return null;
    }

    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error) {
      this.logger.warn(`Failed to fetch Supabase user: ${error.message}`);
      return null;
    }

    return (data as SupabaseAuthResponse | null)?.user ?? null;
  }

  async uploadFile(params: {
    bucket: string;
    path: string;
    file: Buffer | Uint8Array | ArrayBuffer;
    contentType?: string;
  }): Promise<SupabaseStorageUploadResult> {
    const client = this.getClientOrThrow();
    const fileBuffer = this.toBuffer(params.file);

    const { data, error } = await client.storage
      .from(params.bucket)
      .upload(params.path, fileBuffer, {
        contentType: params.contentType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Failed to upload file to Supabase storage: ${error.message}`);
      throw error;
    }

    return {
      bucket: params.bucket,
      path: data?.path ?? params.path,
    };
  }

  async upsertAccount(account: SupabaseAccountUpsert): Promise<SupabaseAccountRecord> {
    const client = this.getClientOrThrow();

    const { data, error } = await client
      .from('accounts')
      .upsert(account, { onConflict: 'user_id,external_id', ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to upsert account in Supabase: ${error.message}`);
      throw error;
    }

    return (data as SupabaseAccountRecord) ?? account;
  }

  async insertStatement(statement: SupabaseStatementInsert): Promise<SupabaseStatementRecord> {
    const client = this.getClientOrThrow();

    const { data, error } = await client
      .from('statements')
      .insert(statement)
      .select('*, account:accounts(*)')
      .single();

    if (error) {
      this.logger.error(`Failed to insert statement in Supabase: ${error.message}`);
      throw error;
    }

    return data as SupabaseStatementRecord;
  }

  async listStatements(userId: string): Promise<SupabaseStatementRecord[]> {
    const client = this.getClientOrThrow();

    const { data, error } = await client
      .from('statements')
      .select('*, account:accounts(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list statements in Supabase: ${error.message}`);
      throw error;
    }

    return (data as SupabaseStatementRecord[]) ?? [];
  }

  async getStatementById(statementId: string): Promise<SupabaseStatementRecord | null> {
    const client = this.getClientOrThrow();

    const { data, error } = await client
      .from('statements')
      .select('*, account:accounts(*)')
      .eq('id', statementId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch statement ${statementId} in Supabase: ${error.message}`);
      return null;
    }

    return (data as SupabaseStatementRecord) ?? null;
  }

  async listStatementTransactions(statementId: string): Promise<SupabaseTransactionRecord[]> {
    const client = this.getClientOrThrow();

    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('statement_id', statementId)
      .order('posted_at', { ascending: true });

    if (error) {
      this.logger.error(`Failed to list statement transactions in Supabase: ${error.message}`);
      throw error;
    }

    return (data as SupabaseTransactionRecord[]) ?? [];
  }

  async queryUserTransactions(
    options: SupabaseTransactionsQueryOptions,
  ): Promise<SupabaseTransactionsQueryResult> {
    const client = this.getClientOrThrow();
    const sortBy = options.sortBy ?? 'posted_at';
    const sortDirection = options.sortDirection ?? 'desc';
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;

    const query = this.applyTransactionFilters(
      client
        .from('transactions')
        .select('*, statement:statements(*, account:accounts(*))', { count: 'exact' }),
      options,
    )
      .order(sortBy, { ascending: sortDirection === 'asc', nullsFirst: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Failed to query user transactions in Supabase: ${error.message}`);
      throw error;
    }

    return {
      data: (data as SupabaseUserTransactionRecord[]) ?? [],
      total: typeof count === 'number' ? count : 0,
    };
  }

  async getMovementsStats(
    options: SupabaseTransactionsQueryOptions,
  ): Promise<SupabaseMovementsStatsResult> {
    const client = this.getClientOrThrow();

    const { data, error } = await client.rpc('movements_stats', {
      p_user_id: options.userId,
      p_account_id: options.accountId ?? null,
      p_statement_id: options.statementId ?? null,
      p_category: options.category ?? null,
      p_merchant: options.merchant ?? null,
      p_search: options.search ?? null,
      p_min_amount: options.minAmount ?? null,
      p_max_amount: options.maxAmount ?? null,
      p_start_date: options.startDate ?? null,
      p_end_date: options.endDate ?? null,
      p_type: options.type ?? null,
    });

    if (error) {
      this.logger.error(`Failed to compute movement stats in Supabase: ${error.message}`);
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : null) as {
      total_count?: number | string | null;
      total_amount?: number | string | null;
      inflow?: number | string | null;
      outflow?: number | string | null;
      average_amount?: number | string | null;
    } | null;

    return {
      count:
        row?.total_count !== undefined && row?.total_count !== null ? Number(row.total_count) : 0,
      totalAmount:
        row?.total_amount !== undefined && row?.total_amount !== null
          ? Number(row.total_amount)
          : 0,
      inflow: row?.inflow !== undefined && row?.inflow !== null ? Number(row.inflow) : 0,
      outflow: row?.outflow !== undefined && row?.outflow !== null ? Number(row.outflow) : 0,
      averageAmount:
        row?.average_amount !== undefined && row?.average_amount !== null
          ? Number(row.average_amount)
          : 0,
    };
  }

  private applyTransactionFilters<TQuery extends TransactionFilterQuery>(
    query: TQuery,
    options: SupabaseTransactionsQueryOptions,
  ): TQuery {
    const sanitizedSearch = options.search?.replace(/,/g, '\\,');

    query.eq('statement.user_id', options.userId);

    if (options.accountId) {
      query.eq('statement.account_id', options.accountId);
    }

    if (options.statementId) {
      query.eq('statement_id', options.statementId);
    }

    if (options.category) {
      query.ilike('category', `%${options.category}%`);
    }

    if (options.merchant) {
      query.ilike('merchant', `%${options.merchant}%`);
    }

    if (sanitizedSearch) {
      query.or(
        [
          `description.ilike.%${sanitizedSearch}%`,
          `raw_description.ilike.%${sanitizedSearch}%`,
          `normalized_description.ilike.%${sanitizedSearch}%`,
          `merchant.ilike.%${sanitizedSearch}%`,
          `category.ilike.%${sanitizedSearch}%`,
        ].join(','),
      );
    }

    if (options.minAmount !== undefined && options.minAmount !== null) {
      query.gte('amount', options.minAmount);
    }

    if (options.maxAmount !== undefined && options.maxAmount !== null) {
      query.lte('amount', options.maxAmount);
    }

    if (options.startDate) {
      query.gte('posted_at', options.startDate);
    }

    if (options.endDate) {
      query.lte('posted_at', options.endDate);
    }

    if (options.type === 'inflow') {
      query.gte('amount', 0);
    } else if (options.type === 'outflow') {
      query.lt('amount', 0);
    }

    return query;
  }

  async listUserTransactions(userId: string): Promise<SupabaseUserTransactionRecord[]> {
    const statements = await this.listStatements(userId);

    if (statements.length === 0) {
      return [];
    }

    const transactionsByStatement = await Promise.all(
      statements.map(async (statement) => {
        const transactions = await this.listStatementTransactions(statement.id);
        return transactions.map<SupabaseUserTransactionRecord>((transaction) => ({
          ...transaction,
          statement,
          account: statement.account ?? null,
        }));
      }),
    );

    return transactionsByStatement.flat();
  }

  async updateStatementById(
    statementId: string,
    patch: SupabaseStatementUpdate,
  ): Promise<SupabaseStatementRecord | null> {
    const client = this.getClientOrThrow();

    const { data, error } = await client
      .from('statements')
      .update(patch)
      .eq('id', statementId)
      .select('*, account:accounts(*)')
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to update statement ${statementId} in Supabase: ${error.message}`);
      throw error;
    }

    return (data as SupabaseStatementRecord | null) ?? null;
  }

  async replaceStatementTransactions(
    statementId: string,
    transactions: SupabaseTransactionUpsert[],
  ): Promise<void> {
    const client = this.getClientOrThrow();

    const deleteResult = await client.from('transactions').delete().eq('statement_id', statementId);
    if (deleteResult.error) {
      this.logger.error(
        `Failed to purge transactions for statement ${statementId}: ${deleteResult.error.message}`,
      );
      throw deleteResult.error;
    }

    if (transactions.length === 0) {
      return;
    }

    const insertResult = await client.from('transactions').insert(transactions);
    if (insertResult.error) {
      this.logger.error(
        `Failed to insert parsed transactions for statement ${statementId}: ${insertResult.error.message}`,
      );
      throw insertResult.error;
    }
  }

  async applyParsedStatementResult(payload: ParsedStatementResultPayload): Promise<void> {
    const processedAt = payload.processedAt ?? new Date().toISOString();
    const status = payload.status === 'failed' ? 'error' : 'parsed';
    const summary = payload.summary ?? {};

    await this.updateStatementById(payload.statementId, {
      status,
      progress: 100,
      error_message: payload.error ?? null,
      processed_at: processedAt,
      total_credit: summary.totalCredit ?? null,
      total_debit: summary.totalDebit ?? null,
      opening_balance: summary.openingBalance ?? null,
      closing_balance: summary.closingBalance ?? null,
      transaction_count: summary.transactionCount ?? null,
      period_start: summary.periodStart ?? null,
      period_end: summary.periodEnd ?? null,
      statement_date: summary.statementDate ?? null,
      checksum: summary.checksum ?? null,
    });

    const transactions = (payload.transactions ?? []).map<SupabaseTransactionUpsert>(
      (tx, index) => ({
        statement_id: payload.statementId,
        id: tx.id ?? tx.externalId ?? randomUUID(),
        external_id: tx.externalId ?? tx.id ?? `${payload.statementId}-${index}`,
        posted_at: tx.postedAt ?? null,
        description: tx.description ?? null,
        raw_description: tx.rawDescription ?? null,
        normalized_description: tx.normalizedDescription ?? null,
        amount: tx.amount ?? null,
        currency: tx.currency ?? null,
        merchant: tx.merchant ?? null,
        category: tx.category ?? null,
        status: tx.status ?? null,
        metadata: tx.metadata ?? null,
      }),
    );

    if (transactions.length > 0) {
      await this.replaceStatementTransactions(payload.statementId, transactions);
    }
  }

  async getLatestForecastResult(
    userId: string,
    forecastType = 'cashflow_projection',
  ): Promise<SupabaseForecastResultRecord | null> {
    const client = this.getClientOrThrow();

    const { data, error } = await client
      .from('forecast_results')
      .select('id, user_id, forecast_type, forecast_data, calculated_at, created_at')
      .eq('user_id', userId)
      .eq('forecast_type', forecastType)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to fetch latest forecast result for user ${userId}: ${error.message}`,
      );
      throw error;
    }

    if (!data) {
      return null;
    }

    const row = data as {
      id: string;
      user_id: string;
      forecast_type: string;
      calculated_at?: string | null;
      created_at?: string | null;
      forecast_data: Record<string, unknown> | null;
    };

    const parsed = this.normalizeForecastData(row.forecast_data);

    const generatedCandidates = [parsed.generatedAt, row.calculated_at, row.created_at].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );

    let generatedAtIso = new Date().toISOString();
    for (const candidate of generatedCandidates) {
      const candidateDate = new Date(candidate);
      if (!Number.isNaN(candidateDate.valueOf())) {
        generatedAtIso = candidateDate.toISOString();
        break;
      }
    }

    return {
      id: row.id,
      userId: row.user_id,
      forecastType: row.forecast_type,
      generatedAt: generatedAtIso,
      horizonDays: parsed.horizonDays ?? parsed.points.length ?? 0,
      historyDays: parsed.historyDays ?? 0,
      modelType: parsed.modelType ?? 'auto',
      metadata: parsed.metadata ?? null,
      points: parsed.points,
    } satisfies SupabaseForecastResultRecord;
  }

  private normalizeForecastData(
    raw: Record<string, unknown> | null,
  ): {
    generatedAt?: string;
    horizonDays?: number;
    historyDays?: number;
    modelType?: string;
    metadata?: Record<string, unknown> | null;
    points: SupabaseForecastPointRecord[];
  } {
    if (!raw || typeof raw !== 'object') {
      return { points: [], metadata: null };
    }

    const metadata = raw['metadata'];
    const metadataRecord =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : null;

    const forecasts = Array.isArray(raw['forecasts'])
      ? (raw['forecasts'] as Array<Record<string, unknown>>)
      : [];

    const points = forecasts
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const dateValue = entry['date'];
        if (typeof dateValue !== 'string') {
          return null;
        }

        const amountValue = entry['amount'];
        const amount =
          typeof amountValue === 'number'
            ? amountValue
            : typeof amountValue === 'string'
            ? Number(amountValue)
            : 0;

        return { date: dateValue, amount } satisfies SupabaseForecastPointRecord;
      })
      .filter((point): point is SupabaseForecastPointRecord => Boolean(point));

    const horizonValue = raw['horizon_days'];
    const historyValue = raw['history_days'];

    const horizonDays =
      typeof horizonValue === 'number'
        ? horizonValue
        : typeof horizonValue === 'string'
        ? Number(horizonValue)
        : undefined;

    const historyDays =
      typeof historyValue === 'number'
        ? historyValue
        : typeof historyValue === 'string'
        ? Number(historyValue)
        : undefined;

    return {
      generatedAt: typeof raw['generated_at'] === 'string' ? (raw['generated_at'] as string) : undefined,
      horizonDays: Number.isFinite(horizonDays) ? (horizonDays as number) : undefined,
      historyDays: Number.isFinite(historyDays) ? (historyDays as number) : undefined,
      modelType: typeof raw['model_type'] === 'string' ? (raw['model_type'] as string) : undefined,
      metadata: metadataRecord,
      points,
    };
  }

  private toBuffer(data: Buffer | Uint8Array | ArrayBuffer): Buffer {
    if (data instanceof Buffer) {
      return data;
    }

    if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    }

    return Buffer.from(data);
  }
}
