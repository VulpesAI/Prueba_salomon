import { Test } from '@nestjs/testing';

describe('AppModule (minimal profile)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CORE_API_PROFILE = 'minimal';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
    delete process.env.STRICT_ENV;
    delete process.env.KAFKA_BROKER;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('registers the noop kafka service when no broker is configured', async () => {
    const [{ AppModule }, { KAFKA_SERVICE }, { NoopKafkaService }] = await Promise.all([
      import('./app.module'),
      import('./kafka/kafka.tokens'),
      import('./kafka/noop-kafka.service'),
    ]);

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = testingModule.createNestApplication();
    await app.init();

    const kafkaModule = Array.from((app as any).container.getModules().values()).find(
      (module: any) => module.metatype?.name === 'KafkaModule',
    ) as any;

    expect(kafkaModule).toBeDefined();

    const noopInstance = await app.resolve(NoopKafkaService, undefined, { strict: false });
    const kafkaTokenInstance = await app.resolve(KAFKA_SERVICE, undefined, { strict: false });

    expect(noopInstance).toBeInstanceOf(NoopKafkaService);
    expect(kafkaTokenInstance).toBe(noopInstance);

    await app.close();
  });
});
