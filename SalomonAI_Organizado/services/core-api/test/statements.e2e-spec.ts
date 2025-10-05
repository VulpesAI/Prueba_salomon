import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';

import { AppModule } from '../src/app.module';
import { setupGlobalPrefix } from '../src/config/app.config';
import {
  SupabaseAccountRecord,
  SupabaseAccountUpsert,
  SupabaseService,
  SupabaseStatementInsert,
  SupabaseStatementRecord,
  SupabaseTransactionRecord,
} from '../src/auth/supabase.service';
import { ParsingEngineProducer, StatementQueuedEvent } from '../src/statements/parsing-engine.producer';

class InMemorySupabaseService {
  private readonly storage = new Map<string, Buffer>();
  private readonly accounts = new Map<string, SupabaseAccountRecord>();
  private readonly accountIndex = new Map<string, string>();
  private readonly statements = new Map<string, SupabaseStatementRecord>();
  private readonly transactions = new Map<string, SupabaseTransactionRecord[]>();

  isEnabled(): boolean {
    return true;
  }

  async getUser() {
    return null;
  }

  async uploadFile(params: {
    bucket: string;
    path: string;
    file: Buffer | Uint8Array | ArrayBuffer;
    contentType?: string;
  }) {
    const buffer = this.toBuffer(params.file);
    this.storage.set(`${params.bucket}/${params.path}`, buffer);
    return { bucket: params.bucket, path: params.path };
  }

  async upsertAccount(account: SupabaseAccountUpsert): Promise<SupabaseAccountRecord> {
    const key = `${account.user_id}:${account.external_id}`;
    const now = new Date().toISOString();
    const existingId = this.accountIndex.get(key);

    if (existingId) {
      const previous = this.accounts.get(existingId);
      if (!previous) {
        throw new Error('Account index mismatch');
      }

      const updated: SupabaseAccountRecord = {
        ...previous,
        ...account,
        id: previous.id,
        created_at: previous.created_at ?? now,
        updated_at: now,
      };

      this.accounts.set(updated.id, updated);
      return updated;
    }

    const id = account.id ?? randomUUID();
    const record: SupabaseAccountRecord = {
      ...account,
      id,
      created_at: now,
      updated_at: now,
    };

    this.accounts.set(id, record);
    this.accountIndex.set(key, id);
    return record;
  }

  async insertStatement(statement: SupabaseStatementInsert): Promise<SupabaseStatementRecord> {
    const now = statement.uploaded_at ?? new Date().toISOString();
    const account = this.accounts.get(statement.account_id) ?? null;

    const record: SupabaseStatementRecord = {
      ...statement,
      created_at: now,
      updated_at: now,
      account,
    };

    this.statements.set(statement.id, record);
    return record;
  }

  async listStatements(userId: string): Promise<SupabaseStatementRecord[]> {
    return Array.from(this.statements.values())
      .filter((statement) => statement.user_id === userId)
      .map((statement) => ({
        ...statement,
        account: statement.account ?? this.accounts.get(statement.account_id) ?? null,
      }));
  }

  async getStatementById(statementId: string): Promise<SupabaseStatementRecord | null> {
    const record = this.statements.get(statementId);
    if (!record) {
      return null;
    }

    return {
      ...record,
      account: record.account ?? this.accounts.get(record.account_id) ?? null,
    };
  }

  async listStatementTransactions(statementId: string): Promise<SupabaseTransactionRecord[]> {
    return [...(this.transactions.get(statementId) ?? [])];
  }

  addTransaction(statementId: string, transaction: SupabaseTransactionRecord) {
    const list = this.transactions.get(statementId) ?? [];
    list.push(transaction);
    this.transactions.set(statementId, list);
  }

  private toBuffer(data: Buffer | Uint8Array | ArrayBuffer): Buffer {
    if (Buffer.isBuffer(data)) {
      return data;
    }

    if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    }

    return Buffer.from(data);
  }
}

class InMemoryParsingEngineProducer {
  public readonly events: StatementQueuedEvent[] = [];

  async emitStatementQueued(event: StatementQueuedEvent): Promise<void> {
    this.events.push(event);
  }
}

describe('StatementsController (e2e)', () => {
  let app: INestApplication;
  let supabaseMock: InMemorySupabaseService;
  let producerMock: InMemoryParsingEngineProducer;

  beforeAll(async () => {
    supabaseMock = new InMemorySupabaseService();
    producerMock = new InMemoryParsingEngineProducer();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue(supabaseMock as unknown as SupabaseService)
      .overrideProvider(ParsingEngineProducer)
      .useValue(producerMock)
      .compile();

    app = moduleFixture.createNestApplication();
    const configService = app.get(ConfigService);
    setupGlobalPrefix(app, configService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads a statement, persists metadata, and emits a parsing event', async () => {
    const userId = 'user-123';

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/statements')
      .field('userId', userId)
      .field('accountExternalId', 'acc-001')
      .field('accountName', 'Cuenta Corriente')
      .field('currency', 'CLP')
      .attach('file', Buffer.from('fake-pdf-content'), 'statement.pdf')
      .expect(HttpStatus.CREATED);

    expect(uploadResponse.body.statement).toBeDefined();
    const statement = uploadResponse.body.statement;
    expect(statement.account.name).toBe('Cuenta Corriente');
    expect(statement.storagePath).toContain('statement.pdf');

    const statementId: string = statement.id;

    expect(producerMock.events).toHaveLength(1);
    expect(producerMock.events[0]).toMatchObject({ statementId, userId });

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/statements')
      .query({ userId })
      .expect(HttpStatus.OK);

    expect(listResponse.body.statements).toHaveLength(1);
    expect(listResponse.body.statements[0].id).toBe(statementId);

    supabaseMock.addTransaction(statementId, {
      id: 'txn-001',
      statement_id: statementId,
      external_id: 'txn-ext-001',
      posted_at: '2024-05-01',
      description: 'Compra supermercado',
      amount: -15290,
      currency: 'CLP',
      merchant: 'Supermercado XYZ',
    });

    const transactionsResponse = await request(app.getHttpServer())
      .get(`/api/v1/statements/${statementId}/transactions`)
      .query({ userId })
      .expect(HttpStatus.OK);

    expect(transactionsResponse.body.statement.id).toBe(statementId);
    expect(transactionsResponse.body.transactions).toHaveLength(1);
    expect(transactionsResponse.body.transactions[0].description).toContain('Compra');
  });
});
