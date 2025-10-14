import { Module } from '@nestjs/common';

import { ConversationSseController } from './sse.controller';

@Module({
  controllers: [ConversationSseController],
})
export class ConversationModule {}
