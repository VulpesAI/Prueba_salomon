import { ConfigService } from '@nestjs/config';
import { FinancialForecastsService } from './financial-forecasts.service';
import { UsersService } from '../users/users.service';
export declare class FinancialForecastsScheduler {
    private readonly forecastsService;
    private readonly usersService;
    private readonly configService;
    private readonly logger;
    private readonly horizonDays;
    constructor(forecastsService: FinancialForecastsService, usersService: UsersService, configService: ConfigService);
    refreshForecastsForUsers(): Promise<void>;
}
