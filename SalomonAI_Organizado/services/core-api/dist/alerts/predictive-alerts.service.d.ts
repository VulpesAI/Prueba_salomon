import { FinancialForecastsService } from '../financial-forecasts/financial-forecasts.service';
export interface PredictiveAlert {
    id: string;
    type: 'cashflow' | 'spending' | 'savings';
    severity: 'low' | 'medium' | 'high';
    message: string;
    forecastDate: string;
    details?: Record<string, any>;
}
export declare class PredictiveAlertsService {
    private readonly forecastsService;
    constructor(forecastsService: FinancialForecastsService);
    generateAlerts(userId: string): Promise<PredictiveAlert[]>;
}
