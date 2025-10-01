import { Injectable, Logger } from '@nestjs/common';
import { SubmitRecommendationFeedbackDto } from './dto/submit-recommendation-feedback.dto';
import { PersonalizedRecommendations } from './recommendations.service';
import { RecommendationsPort } from './recommendations.tokens';

@Injectable()
export class NoopRecommendationsService implements RecommendationsPort {
  private readonly logger = new Logger(NoopRecommendationsService.name);

  async getPersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendations> {
    this.logger.warn(
      `Recommendation engine is not configured. Returning empty recommendations for user ${userId}.`,
    );
    return {
      userId,
      generatedAt: new Date().toISOString(),
      recommendations: [],
      featureSummary: null,
    };
  }

  async sendFeedback(userId: string, payload: SubmitRecommendationFeedbackDto): Promise<void> {
    this.logger.debug(
      `Skipping recommendation feedback for user ${userId} (recommendation engine disabled). Payload: ${JSON.stringify(
        payload,
      )})`,
    );
  }
}
