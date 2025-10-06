import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../../auth/auth.module';
import { RecommendationsModule } from '../../recommendations/recommendations.module';
import { ResultsConnectorController } from './results-connector.controller';
import { ResultsConnectorService } from './results-connector.service';

@Module({
  imports: [ConfigModule, AuthModule, RecommendationsModule],
  controllers: [ResultsConnectorController],
  providers: [ResultsConnectorService],
})
export class ResultsConnectorModule {}
