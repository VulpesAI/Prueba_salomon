import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { BelvoController } from './belvo.controller';
import { BelvoService } from './belvo.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [BelvoController],
  providers: [BelvoService],
  exports: [BelvoService],
})
export class BelvoModule {}
