import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import type { AuthUser } from '@supabase/supabase-js';

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

  async uploadFile(
    params: {
      bucket: string;
      path: string;
      file: Buffer | Uint8Array | ArrayBuffer;
      contentType?: string;
    },
  ): Promise<SupabaseStorageUploadResult> {
    const client = this.getClientOrThrow();
    const fileBuffer = this.toBuffer(params.file);

    const { data, error } = await client.storage.from(params.bucket).upload(params.path, fileBuffer, {
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
