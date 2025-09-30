import { FinancialMovementsService } from '../financial-movements/financial-movements.service';
import { FinancialForecastsService } from '../financial-forecasts/financial-forecasts.service';
import { GoalsService } from '../goals/goals.service';
import { RecommendationsService } from './recommendations.service';
import { SubmitRecommendationFeedbackDto } from './dto/submit-recommendation-feedback.dto';
export declare class DashboardController {
    private readonly financialMovementsService;
    private readonly financialForecastsService;
    private readonly goalsService;
    private readonly recommendationsService;
    constructor(financialMovementsService: FinancialMovementsService, financialForecastsService: FinancialForecastsService, goalsService: GoalsService, recommendationsService: RecommendationsService);
    getDashboardSummary(req: any): Promise<{
        summary: {
            totalIncome: number;
            totalExpenses: number;
            balance: number;
            transactionCount: number;
            period: {
                from: string;
                to: string;
            };
        };
        categories: {};
        trends: any[];
        goals: {
            summary: import("../goals/goals.service").GoalsSummary;
            highlights: import("../goals/goals.service").GoalResponse[];
        };
        recentTransactions: {
            id: string;
            description: string;
            amount: number;
            category: string;
            date: Date;
            currency: string;
        }[];
    }>;
    getGoalsOverview(req: any): Promise<{
        summary: import("../goals/goals.service").GoalsSummary;
        highlights: import("../goals/goals.service").GoalResponse[];
    }>;
    getMovements(req: any, page: number, limit: number, category?: string, startDate?: string, endDate?: string): Promise<{
        movements: {
            id: string;
            description: string;
            amount: number;
            category: string;
            date: Date;
            currency: string;
            type: string;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
    }>;
    getForecasts(req: any): Promise<import("../financial-forecasts/financial-forecasts.service").ForecastSummary | {
        modelType: string;
        generatedAt: any;
        horizonDays: number;
        historyDays: number;
        forecasts: any[];
        trend: {
            direction: string;
            change: number;
            changePercentage: number;
        };
    }>;
    getPersonalizedRecommendations(req: any, refresh?: string): Promise<import("./recommendations.service").PersonalizedRecommendations>;
    submitRecommendationFeedback(req: any, payload: SubmitRecommendationFeedbackDto): Promise<{
        status: string;
    }>;
    getSpendingAnalysis(req: any, months: number): Promise<{
        period: {
            months: number;
            from: string;
            to: string;
        };
        categories: {};
        topCategories: any[];
    }>;
    private calculateWeeklyTrends;
}
