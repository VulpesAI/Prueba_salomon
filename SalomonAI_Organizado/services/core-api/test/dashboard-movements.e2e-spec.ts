import { INestApplication } from '@nestjs/common';
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
  SupabaseUserTransactionRecord,
} from '../src/auth/supabase.service';

class DashboardInMemorySupabaseService {
  private readonly accounts = new Map<string, SupabaseAccountRecord>();
  private readonly statements = new Map<string, SupabaseStatementRecord>();
  private readonly transactions = new Map<string, SupabaseTransactionRecord[]>();

  isEnabled(): boolean {
    return true;
  }

  async getUser() {
    return null;
  }

  reset() {
    this.accounts.clear();
    this.statements.clear();
    this.transactions.clear();
  }

  async upsertAccount(account: SupabaseAccountUpsert): Promise<SupabaseAccountRecord> {
    const id = account.id ?? randomUUID();
    const record: SupabaseAccountRecord = {
      ...account,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.accounts.set(id, record);
    return record;
  }

  async insertStatement(statement: SupabaseStatementInsert): Promise<SupabaseStatementRecord> {
    const record: SupabaseStatementRecord = {
      ...statement,
      account: this.accounts.get(statement.account_id) ?? null,
      created_at: statement.uploaded_at ?? new Date().toISOString(),
      updated_at: statement.uploaded_at ?? new Date().toISOString(),
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
    const statement = this.statements.get(statementId);
    if (!statement) {
      return null;
    }
    return {
      ...statement,
      account: statement.account ?? this.accounts.get(statement.account_id) ?? null,
    };
  }

  async listStatementTransactions(statementId: string): Promise<SupabaseTransactionRecord[]> {
    return [...(this.transactions.get(statementId) ?? [])];
  }

  async listUserTransactions(userId: string): Promise<SupabaseUserTransactionRecord[]> {
    const statements = await this.listStatements(userId);
    const results: SupabaseUserTransactionRecord[] = [];
    for (const statement of statements) {
      const transactions = await this.listStatementTransactions(statement.id);
      for (const transaction of transactions) {
        results.push({
          ...transaction,
          statement,
          account: statement.account ?? null,
        });
      }
    }
    return results;
  }

  addTransaction(statementId: string, transaction: SupabaseTransactionRecord) {
    const list = this.transactions.get(statementId) ?? [];
    list.push(transaction);
    this.transactions.set(statementId, list);
  }
}

const supabaseMock = new DashboardInMemorySupabaseService();

const seedData = async () => {
  supabaseMock.reset();

  const checking = await supabaseMock.upsertAccount({
    user_id: 'user-1',
    external_id: 'checking-1',
    name: 'Cuenta Corriente',
    type: 'checking',
    institution: 'Banco Central',
    currency: 'CLP',
  });

  const credit = await supabaseMock.upsertAccount({
    user_id: 'user-1',
    external_id: 'credit-1',
    name: 'Tarjeta Crédito',
    type: 'credit',
    institution: 'Banco Central',
    currency: 'CLP',
  });

  const statementA = await supabaseMock.insertStatement({
    id: 'stmt-1',
    user_id: 'user-1',
    account_id: checking.id,
    storage_path: 'bucket/path',
    raw_filename: 'stmt1.pdf',
    mime_type: 'application/pdf',
    size: 100,
    status: 'parsed',
    progress: 100,
    error_message: null,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    uploaded_at: '2024-02-01T00:00:00.000Z',
    processed_at: '2024-02-02T00:00:00.000Z',
    checksum: null,
    total_credit: 150000,
    total_debit: 120000,
    transaction_count: 3,
    opening_balance: 500000,
    closing_balance: 530000,
    statement_date: '2024-01-31',
  });

  const statementB = await supabaseMock.insertStatement({
    id: 'stmt-2',
    user_id: 'user-1',
    account_id: credit.id,
    storage_path: 'bucket/path2',
    raw_filename: 'stmt2.pdf',
    mime_type: 'application/pdf',
    size: 100,
    status: 'parsed',
    progress: 100,
    error_message: null,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    uploaded_at: '2024-02-01T00:00:00.000Z',
    processed_at: '2024-02-02T00:00:00.000Z',
    checksum: null,
    total_credit: 0,
    total_debit: 350000,
    transaction_count: 2,
    opening_balance: -200000,
    closing_balance: -550000,
    statement_date: '2024-01-31',
  });

  supabaseMock.addTransaction(statementA.id, {
    id: 'txn-1',
    statement_id: statementA.id,
    external_id: 'txn-1',
    posted_at: '2024-01-05T12:00:00.000Z',
    description: 'Pago Nómina',
    raw_description: 'Pago Nómina',
    normalized_description: 'Pago Nómina',
    amount: 800000,
    currency: 'CLP',
    merchant: 'Empresa XYZ',
    category: 'Ingresos',
    status: 'posted',
    checksum: null,
    dedupe_hash: null,
    metadata: { source: 'payroll' },
    created_at: '2024-01-05T12:00:00.000Z',
    updated_at: '2024-01-05T12:00:00.000Z',
  });

  supabaseMock.addTransaction(statementA.id, {
    id: 'txn-2',
    statement_id: statementA.id,
    external_id: 'txn-2',
    posted_at: '2024-01-10T12:00:00.000Z',
    description: 'Supermercado',
    raw_description: 'Compra supermercado',
    normalized_description: 'Supermercado',
    amount: -120000,
    currency: 'CLP',
    merchant: 'Market',
    category: 'Alimentación',
    status: 'posted',
    checksum: null,
    dedupe_hash: null,
    metadata: null,
    created_at: '2024-01-10T12:00:00.000Z',
    updated_at: '2024-01-10T12:00:00.000Z',
  });

  supabaseMock.addTransaction(statementA.id, {
    id: 'txn-3',
    statement_id: statementA.id,
    external_id: 'txn-3',
    posted_at: '2024-01-15T12:00:00.000Z',
    description: 'Restaurante',
    raw_description: 'Cena',
    normalized_description: 'Restaurante',
    amount: -45000,
    currency: 'CLP',
    merchant: 'Foodies',
    category: 'Alimentación',
    status: 'posted',
    checksum: null,
    dedupe_hash: null,
    metadata: null,
    created_at: '2024-01-15T12:00:00.000Z',
    updated_at: '2024-01-15T12:00:00.000Z',
  });

  supabaseMock.addTransaction(statementB.id, {
    id: 'txn-4',
    statement_id: statementB.id,
    external_id: 'txn-4',
    posted_at: '2024-01-08T12:00:00.000Z',
    description: 'Compra Electrónica',
    raw_description: 'Electrónica',
    normalized_description: 'Electrónica',
    amount: -250000,
    currency: 'CLP',
    merchant: 'Tech Store',
    category: 'Tecnología',
    status: 'posted',
    checksum: null,
    dedupe_hash: null,
    metadata: { installments: 6 },
    created_at: '2024-01-08T12:00:00.000Z',
    updated_at: '2024-01-08T12:00:00.000Z',
  });

  supabaseMock.addTransaction(statementB.id, {
    id: 'txn-5',
    statement_id: statementB.id,
    external_id: 'txn-5',
    posted_at: '2024-01-20T12:00:00.000Z',
    description: 'Pago Tarjeta',
    raw_description: 'Pago Tarjeta',
    normalized_description: 'Pago Tarjeta',
    amount: 200000,
    currency: 'CLP',
    merchant: 'Banco Central',
    category: 'Pagos',
    status: 'posted',
    checksum: null,
    dedupe_hash: null,
    metadata: null,
    created_at: '2024-01-20T12:00:00.000Z',
    updated_at: '2024-01-20T12:00:00.000Z',
  });
};

describe('Dashboard & Movements (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue(supabaseMock)
      .compile();

    app = moduleFixture.createNestApplication();
    const configService = moduleFixture.get(ConfigService);
    setupGlobalPrefix(app, configService);
    await app.init();
  });

  beforeEach(async () => {
    await seedData();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns aggregated dashboard summary', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .query({ userId: 'user-1', maxCategories: 2 })
      .expect(200);

    expect(response.body.totals).toMatchObject({
      inflow: 1000000,
      outflow: 415000,
      net: 585000,
      currency: 'CLP',
    });

    expect(response.body.categories).toHaveLength(2);
    expect(response.body.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ period: '2024-01', inflow: 1000000, outflow: 415000 }),
      ]),
    );
  });

  it('returns paginated movements with filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/movements')
      .query({ userId: 'user-1', page: 1, pageSize: 2, type: 'outflow', sortBy: 'postedAt' })
      .expect(200);

    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 2, total: 3 });
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      category: expect.any(String),
      conversational: expect.objectContaining({ summary: expect.any(String) }),
    });
  });
});
