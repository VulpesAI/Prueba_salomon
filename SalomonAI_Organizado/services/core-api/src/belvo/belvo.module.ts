import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BelvoController } from './belvo.controller';
import { BelvoService } from './belvo.service';

@Module({
  imports: [ConfigModule],
  controllers: [BelvoController],
  providers: [BelvoService],
  exports: [BelvoService],
})
export class BelvoModule {}
