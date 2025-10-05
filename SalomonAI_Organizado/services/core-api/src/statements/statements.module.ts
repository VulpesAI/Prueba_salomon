import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport, type KafkaOptions } from '@nestjs/microservices';

import { AuthModule } from '../auth/auth.module';
import { ParsingEngineProducer } from './parsing-engine.producer';
import { PARSING_ENGINE_CLIENT } from './statements.constants';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [StatementsController],
  providers: [
    StatementsService,
    ParsingEngineProducer,
    {
      provide: PARSING_ENGINE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const brokersConfig = configService.get<string[] | undefined>(
          'messaging.parsingEngine.brokers',
          { infer: true },
        );

        const brokers: string[] = Array.isArray(brokersConfig) ? brokersConfig : [];

        if (brokers.length === 0) {
          return null;
        }

        const clientId = `core-api-statements-${Math.random().toString(36).slice(2, 8)}`;

        const kafkaOptions: KafkaOptions = {
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId,
              brokers,
            },
            producer: {
              allowAutoTopicCreation: true,
            },
          },
        };

        return ClientProxyFactory.create(kafkaOptions);
      },
    },
  ],
  exports: [StatementsService],
})
export class StatementsModule {}
