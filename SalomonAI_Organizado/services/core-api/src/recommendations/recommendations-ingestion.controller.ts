import { Controller, Get } from '@nestjs/common';

import { RecommendationsIngestionService } from './recommendations-ingestion.service';

@Controller()
export class RecommendationsIngestionController {
  constructor(private readonly ingestionService: RecommendationsIngestionService) {}

  @Get('categorized')
  listCategorized() {
    return {
      data: this.ingestionService.getAllTransactions(),
      meta: this.ingestionService.getStatus(),
    };
  }

  @Get('recommendations/ingestion/status')
  getStatus() {
    return this.ingestionService.getStatus();
  }
}
