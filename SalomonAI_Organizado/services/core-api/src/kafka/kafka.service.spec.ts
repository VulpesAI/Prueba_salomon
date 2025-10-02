import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { KafkaService } from './kafka.service';

jest.mock('kafkajs', () => {
  const mockProducer = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(),
  };

  const mockKafka = {
    producer: jest.fn(() => mockProducer),
  };

  return {
    Kafka: jest.fn(() => mockKafka),
    __mockProducer: mockProducer,
    __mockKafka: mockKafka,
  };
});

const kafkaModule = jest.requireMock('kafkajs') as {
  Kafka: jest.Mock;
  __mockProducer: {
    connect: jest.Mock;
    disconnect: jest.Mock;
    send: jest.Mock;
  };
  __mockKafka: {
    producer: jest.Mock;
  };
};

const mockProducer = kafkaModule.__mockProducer;

describe('KafkaService', () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  const createKafkaService = (overrides?: Record<string, unknown>) => {
    const defaults: Record<string, unknown> = {
      STRICT_ENV: false,
      'app.profile': 'minimal',
      CORE_API_PROFILE: 'minimal',
      KAFKA_BROKER: 'localhost:9092',
      KAFKA_CLIENT_ID: 'salomon-api',
    };

    const values = { ...defaults, ...(overrides ?? {}) };

    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) =>
        Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue,
      ),
    } as unknown as ConfigService;

    return new KafkaService(configService);
  };

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

    mockProducer.connect.mockReset();
    mockProducer.disconnect.mockReset();
    mockProducer.send.mockReset();
    kafkaModule.Kafka.mockClear();
    kafkaModule.__mockKafka.producer.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('continues bootstrapping when Kafka is unavailable in minimal mode', async () => {
    const service = createKafkaService();
    const error = new Error('Kafka unavailable');
    mockProducer.connect.mockRejectedValueOnce(error);

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'Kafka broker is unavailable. Continuing without Kafka because STRICT_ENV is disabled.',
      error,
    );
    expect(errorSpy).not.toHaveBeenCalled();

    await expect(
      service.produce({ topic: 'test-topic', messages: [{ value: 'payload' }] } as any),
    ).resolves.toBeUndefined();
    expect(mockProducer.send).not.toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.some(
        ([message]) =>
          typeof message === 'string' &&
          message.includes('Kafka producer is not connected; skipping send to topic test-topic'),
      ),
    ).toBe(true);
  });

  it('skips produceWithRetry when Kafka is disabled', async () => {
    const service = createKafkaService();

    await expect(
      service.produceWithRetry({ topic: 'retry-topic', messages: [{ value: 'payload' }] } as any),
    ).resolves.toBeUndefined();

    expect(mockProducer.send).not.toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.some(
        ([message]) =>
          typeof message === 'string' &&
          message.includes('Kafka producer is not connected; skipping retry send to topic retry-topic'),
      ),
    ).toBe(true);
  });

  it('fails fast when STRICT_ENV is true', async () => {
    const service = createKafkaService({ STRICT_ENV: true, 'app.profile': 'full', CORE_API_PROFILE: 'full' });
    const error = new Error('Kafka unavailable');
    mockProducer.connect.mockRejectedValueOnce(error);

    await expect(service.onModuleInit()).rejects.toBe(error);

    expect(errorSpy).toHaveBeenCalledWith('Failed to connect to Kafka', error);
  });
});

