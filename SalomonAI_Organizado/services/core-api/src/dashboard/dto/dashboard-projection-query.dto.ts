import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Min } from 'class-validator';

type ForecastingModel = 'auto' | 'arima' | 'prophet';

const FORECASTING_MODELS: ForecastingModel[] = ['auto', 'arima', 'prophet'];

export class DashboardProjectionQueryDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  horizonDays?: number;

  @IsOptional()
  @IsIn(FORECASTING_MODELS, {
    message: 'model must be one of auto, arima, prophet',
  })
  model?: ForecastingModel;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  refresh?: boolean;
}

export { FORECASTING_MODELS };
