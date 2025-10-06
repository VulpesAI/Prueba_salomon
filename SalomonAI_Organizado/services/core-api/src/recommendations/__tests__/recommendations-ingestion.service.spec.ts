import { ConfigService } from '@nestjs/config';

import { RecommendationsIngestionService } from '../recommendations-ingestion.service';
import { SupabaseService } from '../../auth/supabase.service';

describe('RecommendationsIngestionService', () => {
  const baseTransaction = {
    id: 'tx-1',
    statement_id: 'st-1',
    posted_at: '2024-05-01T00:00:00.000Z',
    amount: -12500.5,
    category: 'Restaurantes',
    description: 'Cena con clientes',
    merchant: 'Bistro Central',
    currency: 'CLP',
    statement: {
      id: 'st-1',
      user_id: 'user-123',
      account_id: 'acc-1',
      period_start: '2024-04-01',
      period_end: '2024-04-30',
      statement_date: '2024-04-30',
    },
    account: {
      id: 'acc-1',
      user_id: 'user-123',
      external_id: 'ext-1',
      currency: 'CLP',
      name: 'Cuenta Corriente',
      type: 'checking',
      institution: 'Banco Ejemplo',
    },
  } as const;

  const createService = (override?: Partial<ConfigService>) => {
    const supabaseMock: jest.Mocked<Pick<SupabaseService, 'isEnabled' | 'listUserTransactions'>> = {
      isEnabled: jest.fn().mockReturnValue(true),
      listUserTransactions: jest.fn().mockResolvedValue([baseTransaction]),
    };

    const configService = {
      get: jest.fn().mockReturnValue({ ingestionIntervalMs: 0 }),
      ...(override ?? {}),
    } as unknown as ConfigService;

    const service = new RecommendationsIngestionService(
      supabaseMock as unknown as SupabaseService,
      configService,
    );
    return { service, supabaseMock };
  };

  it('normalizes transactions and stores them per user', async () => {
    const { service, supabaseMock } = createService();

    await service.ingestUser('user-123');

    expect(supabaseMock.listUserTransactions).toHaveBeenCalledWith('user-123');

    const data = service.getAllTransactions();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: 'tx-1',
      userId: 'user-123',
      user_id: 'user-123',
      category: 'restaurantes',
      amount: -12500.5,
      statementId: 'st-1',
      accountId: 'acc-1',
      timestamp: '2024-05-01T00:00:00.000Z',
    });

    const status = service.getStatus();
    expect(status.trackedUsers).toBe(1);
    expect(status.lastRefreshByUser['user-123']).toBeDefined();
  });
});
