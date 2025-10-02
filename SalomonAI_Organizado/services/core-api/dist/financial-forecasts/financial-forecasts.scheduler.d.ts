import { ConfigService } from '@nestjs/config';
import { FinancialForecastsService } from './financial-forecasts.service';
import { UserDirectoryService } from '../users/interfaces/user-directory.interface';
export declare class FinancialForecastsScheduler {
    private readonly forecastsService;
    private readonly usersService;
    private readonly configService;
    private readonly logger;
    private readonly horizonDays;
    constructor(forecastsService: FinancialForecastsService, usersService: UserDirectoryService, configService: ConfigService);
    refreshForecastsForUsers(): Promise<void>;
}
