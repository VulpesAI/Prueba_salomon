import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';

import {
  SupabaseMovementsStatsResult,
  SupabaseService,
  SupabaseTransactionsQueryResult,
  SupabaseTransactionsQueryOptions,
  SupabaseUserTransactionRecord,
} from '../../auth/supabase.service';
import {
  GetMovementsQueryDto,
  MovementSortDirection,
  MovementSortField,
  MovementTypeFilter,
} from '../dto/get-movements-query.dto';
import { MovementsService } from '../movements.service';

describe('MovementsService', () => {
  let service: MovementsService;
  let supabaseService: jest.Mocked<
    Pick<SupabaseService, 'queryUserTransactions' | 'getMovementsStats'>
  >;
  let configService: ConfigService;

  const baseTransaction = {
    id: 'tx-1',
    statement_id: 'st-1',
    external_id: 'ext-1',
    posted_at: '2024-01-15',
    description: 'Salary January',
    raw_description: null,
    normalized_description: null,
    amount: 1500,
    currency: 'USD',
    merchant: 'Acme Corp',
    category: 'Income',
    status: null,
    checksum: null,
    dedupe_hash: null,
    metadata: { source: 'payroll' },
    created_at: null,
    updated_at: null,
    statement: {
      id: 'st-1',
      user_id: 'user-1',
      account_id: 'acc-1',
      storage_path: 'path',
      raw_filename: 'file.pdf',
      mime_type: 'application/pdf',
      size: 100,
      status: 'parsed',
      uploaded_at: '2024-01-01T00:00:00.000Z',
      processed_at: '2024-01-02T00:00:00.000Z',
      account: {
        id: 'acc-1',
        user_id: 'user-1',
        external_id: 'ext-acc-1',
        name: 'Main Account',
        type: 'checking',
        institution: 'Salomon Bank',
        currency: 'USD',
      },
    },
    account: null,
  } as unknown as SupabaseUserTransactionRecord;

  beforeEach(() => {
    supabaseService = {
      queryUserTransactions: jest.fn(),
      getMovementsStats: jest.fn(),
    } as jest.Mocked<
      Pick<SupabaseService, 'queryUserTransactions' | 'getMovementsStats'>
    >;

    configService = {
      get: jest.fn().mockReturnValue({ defaultPageSize: 20, maxPageSize: 100 }),
    } as unknown as ConfigService;

    service = new MovementsService(
      supabaseService as unknown as SupabaseService,
      configService,
    );
  });

  it('requests paginated movements with filters applied in Supabase and maps the response', async () => {
    const query: GetMovementsQueryDto = {
      userId: 'user-1',
      accountId: 'acc-1',
      statementId: 'st-1',
      category: 'Income',
      merchant: 'Acme',
      search: 'Salary',
      minAmount: 1000,
      maxAmount: 2000,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      type: MovementTypeFilter.INFLOW,
      page: 2,
      pageSize: 10,
      sortBy: MovementSortField.AMOUNT,
      sortDirection: MovementSortDirection.ASC,
    };

    const supabaseResult: SupabaseTransactionsQueryResult = {
      data: [baseTransaction],
      total: 25,
    };
    const statsResult: SupabaseMovementsStatsResult = {
      count: 25,
      totalAmount: 50000,
      inflow: 50000,
      outflow: 0,
      averageAmount: 2000,
    };

    supabaseService.queryUserTransactions.mockResolvedValue(supabaseResult);
    supabaseService.getMovementsStats.mockResolvedValue(statsResult);

    const result = await service.listMovements(query);

    expect(supabaseService.queryUserTransactions).toHaveBeenCalledTimes(1);
    const options = supabaseService.queryUserTransactions.mock.calls[0][0] as SupabaseTransactionsQueryOptions;
    expect(options).toMatchObject({
      userId: 'user-1',
      accountId: 'acc-1',
      statementId: 'st-1',
      category: 'Income',
      merchant: 'Acme',
      search: 'Salary',
      minAmount: 1000,
      maxAmount: 2000,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      type: 'inflow',
      page: 2,
      pageSize: 10,
      sortBy: 'amount',
      sortDirection: 'asc',
    });

    expect(supabaseService.getMovementsStats).toHaveBeenCalledWith(options);

    expect(result.pagination).toEqual({ page: 2, pageSize: 10, total: 25, totalPages: 3 });
    expect(result.filters.page).toBe(2);
    expect(result.filters.pageSize).toBe(10);
    expect(result.stats).toEqual({
      count: 25,
      totalAmount: 50000,
      inflow: 50000,
      outflow: 0,
      averageAmount: 2000,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'tx-1',
      amount: 1500,
      category: 'Income',
      conversational: {
        direction: 'inflow',
        summary: expect.stringContaining('Ingreso de'),
      },
    });
  });
});
