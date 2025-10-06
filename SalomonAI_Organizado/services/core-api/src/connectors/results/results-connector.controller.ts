import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';

import { loadRootEnv } from '../../config/env.loader';
import { ResultsConnectorService } from './results-connector.service';

loadRootEnv();

const PARSED_STATEMENTS_TOPIC = process.env.PARSED_STATEMENTS_TOPIC ?? 'statements.out';

@Controller()
export class ResultsConnectorController {
  private readonly logger = new Logger(ResultsConnectorController.name);

  constructor(private readonly resultsService: ResultsConnectorService) {}

  @EventPattern(PARSED_STATEMENTS_TOPIC)
  async handleParsedStatement(
    @Payload() payload: unknown,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    const topic = context.getTopic() ?? PARSED_STATEMENTS_TOPIC;
    const message = context.getMessage();

    try {
      await this.resultsService.handleKafkaMessage(topic, message, payload);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unexpected error while handling parsed statement message: ${messageText}`);
    }
  }
}
