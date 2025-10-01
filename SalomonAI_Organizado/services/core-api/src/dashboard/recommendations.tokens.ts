export const RECOMMENDATIONS_SERVICE = Symbol('RECOMMENDATIONS_SERVICE');

export interface RecommendationsPort {
  getPersonalizedRecommendations(
    userId: string,
    refresh?: boolean,
  ): Promise<import('./recommendations.service').PersonalizedRecommendations>;
  sendFeedback(
    userId: string,
    payload: import('./dto/submit-recommendation-feedback.dto').SubmitRecommendationFeedbackDto,
  ): Promise<void>;
}
