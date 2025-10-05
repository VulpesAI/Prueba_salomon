import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { GetRecommendationHistoryDto } from './dto/get-recommendation-history.dto';
import { SubmitRecommendationFeedbackDto } from './dto/submit-feedback.dto';
import { RecommendationsGatewayService } from './recommendations-gateway.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly gateway: RecommendationsGatewayService) {}

  @Get('history')
  async getHistory(@Query() query: GetRecommendationHistoryDto) {
    return this.gateway.getHistory(query.userId);
  }

  @Post(':id/feedback')
  async submitFeedback(
    @Param('id') recommendationId: string,
    @Body() payload: SubmitRecommendationFeedbackDto,
  ) {
    return this.gateway.submitFeedback(recommendationId, payload);
  }
}
