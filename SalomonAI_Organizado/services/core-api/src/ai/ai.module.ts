import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DashboardModule } from '../dashboard/dashboard.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [ConfigModule, DashboardModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
