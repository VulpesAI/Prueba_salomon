import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Express } from 'express';
import { promises as fsPromises } from 'fs';
import { basename, join } from 'path';

import {
  SupabaseAccountRecord,
  SupabaseService,
  SupabaseStatementInsert,
  SupabaseStatementRecord,
  SupabaseTransactionRecord,
} from '../auth/supabase.service';
import { CreateStatementDto } from './dto/create-statement.dto';
import { GetStatementsQueryDto } from './dto/get-statements-query.dto';
import {
  GetStatementTransactionsParamsDto,
  GetStatementTransactionsQueryDto,
} from './dto/get-statement-transactions.dto';
import { ParsingEngineProducer } from './parsing-engine.producer';

export interface StatementSummary {
  id: string;
  status: string;
  progress: number | null;
  error: string | null;
  storagePath: string;
  uploadedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  checksum: string | null;
  account: {
    id: string;
    externalId: string;
    name: string | null;
    type: string | null;
    institution: string | null;
    currency: string | null;
  } | null;
}

export interface StatementTransactionResponse {
  id: string;
  postedAt: string | null;
  description: string | null;
  amount: number | null;
  currency: string | null;
  merchant: string | null;
}

@Injectable()
export class StatementsService {
  private readonly logger = new Logger(StatementsService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly parsingEngineProducer: ParsingEngineProducer,
  ) {
    this.uploadDir =
      this.configService.get<string>('statements.uploadDir', { infer: true }) ?? '/uploads';
  }

  async createStatement(
    dto: CreateStatementDto,
    file: Express.Multer.File | undefined,
  ): Promise<StatementSummary> {
    if (!file) {
      throw new BadRequestException('A statement file is required');
    }

    const statementId = randomUUID();
    const externalId =
      dto.accountExternalId?.trim() || dto.accountName?.trim() || `${dto.userId}-${statementId}`;

    const accountPayload = {
      user_id: dto.userId,
      external_id: externalId,
      name: dto.accountName ?? null,
      type: dto.accountType ?? null,
      institution: dto.institution ?? null,
      currency: dto.currency ?? null,
    } satisfies Partial<SupabaseAccountRecord> & { user_id: string; external_id: string };
    const sanitizedFileName = this.sanitizeFileName(file.originalname, statementId);
    let storagePath: string | null = null;
    let statementCreated = false;

    try {
      const account = await this.supabaseService.upsertAccount(accountPayload);

      storagePath = await this.saveFileToUploadVolume({
        userId: dto.userId,
        statementId,
        fileName: sanitizedFileName,
        fileBuffer: file.buffer,
      });

      const statementRecord = await this.supabaseService.insertStatement(this.buildStatementInsert({
        statementId,
        dto,
        file,
        accountId: account.id,
        storagePath,
      }));
      statementCreated = true;

      await this.parsingEngineProducer.emitStatementQueued({
        statementId: statementRecord.id,
        userId: dto.userId,
        filePath: statementRecord.storage_path,
      });

      return this.toStatementSummary(statementRecord);
    } catch (error) {
      if (storagePath && !statementCreated) {
        await this.removeFileIfExists(storagePath);
      }

      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to store statement: ${message}`);
      throw new InternalServerErrorException('Failed to store statement');
    }
  }

  async listStatements(query: GetStatementsQueryDto): Promise<StatementSummary[]> {
    try {
      const statements = await this.supabaseService.listStatements(query.userId);
      const filtered = query.status
        ? statements.filter((statement) => statement.status === query.status)
        : statements;

      return filtered.map((statement) => this.toStatementSummary(statement));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to list statements: ${message}`);
      throw new InternalServerErrorException('Failed to list statements');
    }
  }

  async getStatementTransactions(
    params: GetStatementTransactionsParamsDto,
    query: GetStatementTransactionsQueryDto,
  ): Promise<{
    statement: StatementSummary;
    transactions: StatementTransactionResponse[];
  }> {
    try {
      const statement = await this.supabaseService.getStatementById(params.id);

      if (!statement || statement.user_id !== query.userId) {
        throw new NotFoundException('Statement not found');
      }

      const transactions = await this.supabaseService.listStatementTransactions(params.id);

      return {
        statement: this.toStatementSummary(statement),
        transactions: transactions.map((transaction) => this.toTransactionResponse(transaction)),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve statement transactions: ${message}`);
      throw new InternalServerErrorException('Failed to retrieve statement transactions');
    }
  }

  private buildStatementInsert(params: {
    statementId: string;
    dto: CreateStatementDto;
    file: Express.Multer.File;
    accountId: string;
    storagePath: string;
  }): SupabaseStatementInsert {
    const uploadedAt = new Date().toISOString();
    const statementDate = params.dto.periodEnd ?? params.dto.periodStart ?? null;

    return {
      id: params.statementId,
      user_id: params.dto.userId,
      account_id: params.accountId,
      storage_path: params.storagePath,
      raw_filename: params.file.originalname,
      mime_type: params.file.mimetype ?? null,
      size: params.file.size ?? params.file.buffer?.length ?? null,
      status: 'pendiente',
      progress: 0,
      error_message: null,
      period_start: params.dto.periodStart ?? null,
      period_end: params.dto.periodEnd ?? null,
      statement_date: statementDate,
      uploaded_at: uploadedAt,
      checksum: params.dto.checksum ?? null,
      dedupe_hash: params.dto.checksum ?? null,
    };
  }

  private toStatementSummary(record: SupabaseStatementRecord): StatementSummary {
    return {
      id: record.id,
      status: record.status,
      progress: record.progress ?? 0,
      error: record.error_message ?? null,
      storagePath: record.storage_path,
      uploadedAt: record.uploaded_at ?? record.created_at ?? null,
      periodStart: record.period_start ?? null,
      periodEnd: record.period_end ?? null,
      checksum: record.checksum ?? null,
      account: record.account
        ? {
            id: record.account.id,
            externalId: record.account.external_id,
            name: record.account.name ?? null,
            type: record.account.type ?? null,
            institution: record.account.institution ?? null,
            currency: record.account.currency ?? null,
          }
        : null,
    };
  }

  private toTransactionResponse(
    transaction: SupabaseTransactionRecord,
  ): StatementTransactionResponse {
    return {
      id: transaction.id,
      postedAt: transaction.posted_at ?? null,
      description: transaction.description ?? null,
      amount: transaction.amount ?? null,
      currency: transaction.currency ?? null,
      merchant: transaction.merchant ?? null,
    };
  }

  private sanitizeFileName(originalName: string | undefined, statementId: string): string {
    const fallback = `${statementId}.dat`;

    if (!originalName) {
      return fallback;
    }

    const baseName = basename(originalName.trim());
    const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

    return sanitized.length > 0 ? sanitized : fallback;
  }

  private async saveFileToUploadVolume(params: {
    userId: string;
    statementId: string;
    fileName: string;
    fileBuffer: Buffer | undefined;
  }): Promise<string> {
    if (!params.fileBuffer) {
      throw new BadRequestException('Uploaded statement file is empty or unavailable');
    }

    const targetDir = join(this.uploadDir, params.userId, params.statementId);
    await fsPromises.mkdir(targetDir, { recursive: true });
    const filePath = join(targetDir, params.fileName);

    await fsPromises.writeFile(filePath, params.fileBuffer);

    return filePath;
  }

  private async removeFileIfExists(filePath: string): Promise<void> {
    try {
      await fsPromises.unlink(filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== 'ENOENT') {
        const message = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Failed to remove statement file ${filePath}: ${message}`);
      }
    }
  }
}
