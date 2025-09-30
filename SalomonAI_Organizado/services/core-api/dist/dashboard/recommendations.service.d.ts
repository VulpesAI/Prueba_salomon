import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SubmitRecommendationFeedbackDto } from './dto/submit-recommendation-feedback.dto';
export interface RecommendationItem {
    id: string;
    title: string;
    description: string;
    score: number;
    category: string;
    explanation: string;
    generatedAt: string;
    cluster?: number | null;
}
export interface PersonalizedRecommendations {
    userId: string;
    generatedAt: string;
    recommendations: RecommendationItem[];
    featureSummary?: Record<string, any> | null;
}
export declare class RecommendationsService {
    private readonly httpService;
    private readonly configService;
    private readonly logger;
    private readonly timeout;
    constructor(httpService: HttpService, configService: ConfigService);
    getPersonalizedRecommendations(userId: string, refresh?: boolean): Promise<PersonalizedRecommendations>;
    sendFeedback(userId: string, payload: SubmitRecommendationFeedbackDto): Promise<void>;
}
