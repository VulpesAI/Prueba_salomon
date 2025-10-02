import { SubmitRecommendationFeedbackDto } from './dto/submit-recommendation-feedback.dto';
import { PersonalizedRecommendations } from './recommendations.service';
import { RecommendationsPort } from './recommendations.tokens';
export declare class NoopRecommendationsService implements RecommendationsPort {
    private readonly logger;
    getPersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendations>;
    sendFeedback(userId: string, payload: SubmitRecommendationFeedbackDto): Promise<void>;
}
