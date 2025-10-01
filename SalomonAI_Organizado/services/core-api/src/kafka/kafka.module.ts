import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { NoopKafkaService } from './noop-kafka.service';
import { KAFKA_SERVICE } from './kafka.tokens';

@Global()
@Module({})
export class KafkaModule {
  static register(options: { enabled: boolean }): DynamicModule {
    const providers = options.enabled
      ? [
          KafkaService,
          {
            provide: KAFKA_SERVICE,
            useExisting: KafkaService,
          },
        ]
      : [
          NoopKafkaService,
          {
            provide: KAFKA_SERVICE,
            useExisting: NoopKafkaService,
          },
          {
            provide: KafkaService,
            useExisting: NoopKafkaService,
          },
        ];

    return {
      module: KafkaModule,
      imports: [ConfigModule],
      providers,
      exports: [KAFKA_SERVICE, KafkaService],
    };
  }
}
