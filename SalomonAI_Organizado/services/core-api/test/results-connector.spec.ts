import { Kafka } from 'kafkajs';
import { KafkaContainer } from 'testcontainers';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { ResultsConnectorService } from '../src/connectors/results/results-connector.service';
import { SupabaseService } from '../src/auth/supabase.service';

jest.setTimeout(120000);

describe('ResultsConnectorService (integration)', () => {
  let container: KafkaContainer;
  let service: ResultsConnectorService;
  const supabaseMock = {
    applyParsedStatementResult: jest.fn().mockResolvedValue(undefined),
  };
  const topic = 'parsed.statements.tests';

  beforeAll(async () => {
    container = await new KafkaContainer().start();
    const brokers = [container.getBootstrapServers()];

    const configStub = {
      get: <T>(key: string): T | undefined => {
        if (key === 'messaging.results') {
          return {
            enabled: true,
            topic,
            groupId: `core-api-results-${Math.random().toString(36).slice(2, 8)}`,
            brokers,
          } as T;
        }
        return undefined;
      },
    };

    const moduleFixture = await Test.createTestingModule({
      providers: [
        ResultsConnectorService,
        { provide: ConfigService, useValue: configStub },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compile();

    service = moduleFixture.get(ResultsConnectorService);
    await service.onModuleInit();
  });

  afterAll(async () => {
    await service.onModuleDestroy();
    await container.stop();
  });

  beforeEach(() => {
    supabaseMock.applyParsedStatementResult.mockClear();
  });

  it('consumes parsed statement events and forwards them to Supabase', async () => {
    const kafka = new Kafka({ brokers: [container.getBootstrapServers()] });
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify({
            statementId: 'stmt-100',
            userId: 'user-99',
            status: 'completed',
            summary: { totalCredit: 1500, totalDebit: 500 },
            transactions: [
              {
                id: 'txn-1',
                postedAt: '2024-01-01T00:00:00.000Z',
                amount: 1500,
                currency: 'CLP',
              },
            ],
          }),
        },
      ],
    });
    await producer.disconnect();

    await waitFor(async () => supabaseMock.applyParsedStatementResult.mock.calls.length > 0, 10000);

    expect(supabaseMock.applyParsedStatementResult).toHaveBeenCalledWith(
      expect.objectContaining({
        statementId: 'stmt-100',
        status: 'completed',
        transactions: expect.arrayContaining([
          expect.objectContaining({ amount: 1500, currency: 'CLP' }),
        ]),
      }),
    );
  });
});

const waitFor = async (predicate: () => boolean | Promise<boolean>, timeoutMs: number) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Condition not met within timeout');
};
