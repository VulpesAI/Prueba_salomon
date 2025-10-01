import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantService } from './qdrant.service';
import { NoopQdrantService } from './noop-qdrant.service';
import { QDRANT_SERVICE } from './qdrant.tokens';

@Global()
@Module({})
export class QdrantModule {
  static register(options: { enabled: boolean }): DynamicModule {
    const providers = options.enabled
      ? [
          QdrantService,
          {
            provide: QDRANT_SERVICE,
            useExisting: QdrantService,
          },
        ]
      : [
          NoopQdrantService,
          {
            provide: QDRANT_SERVICE,
            useExisting: NoopQdrantService,
          },
          {
            provide: QdrantService,
            useExisting: NoopQdrantService,
          },
        ];

    return {
      module: QdrantModule,
      imports: [ConfigModule],
      providers,
      exports: [QDRANT_SERVICE, QdrantService],
    };
  }
}
