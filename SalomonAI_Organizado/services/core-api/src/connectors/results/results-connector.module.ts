import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../../auth/auth.module';
import { ResultsConnectorService } from './results-connector.service';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [ResultsConnectorService],
})
export class ResultsConnectorModule {}
