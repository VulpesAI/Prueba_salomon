import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinancialForecast } from './entities/financial-forecast.entity';
export interface ForecastSummary {
    modelType: string;
    generatedAt: string;
    horizonDays: number;
    historyDays: number;
    forecasts: {
        date: string;
        amount: number;
    }[];
    trend: {
        direction: 'upward' | 'downward' | 'stable';
        change: number;
        changePercentage: number;
    };
    metadata?: Record<string, any>;
}
export declare class FinancialForecastsService {
    private readonly forecastsRepository;
    private readonly httpService;
    private readonly configService;
    private readonly eventEmitter;
    private readonly logger;
    private readonly baseUrl;
    private readonly defaultHorizon;
    constructor(forecastsRepository: Repository<FinancialForecast>, httpService: HttpService, configService: ConfigService, eventEmitter: EventEmitter2);
    refreshForecastsForUser(userId: string, horizon?: number, model?: 'auto' | 'arima' | 'prophet'): Promise<ForecastSummary | null>;
    getForecastSummary(userId: string): Promise<ForecastSummary | null>;
    getForecastSeries(userId: string): Promise<FinancialForecast[]>;
    private fetchForecastsFromEngine;
    private persistForecasts;
    private toSummary;
}
