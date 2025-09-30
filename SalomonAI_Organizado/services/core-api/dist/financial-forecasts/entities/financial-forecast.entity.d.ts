import { User } from '../../users/entities/user.entity';
export declare class FinancialForecast {
    id: string;
    user: User;
    forecastDate: Date;
    predictedValue: number;
    modelType: string;
    horizonDays: number;
    generatedAt: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
