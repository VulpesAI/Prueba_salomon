import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, Min } from 'class-validator';

import { FORECASTING_MODELS } from '../../dashboard/dto/dashboard-projection-query.dto';

export class ForecastingTriggerQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  horizonDays?: number;

  @IsOptional()
  @IsIn(FORECASTING_MODELS, {
    message: 'model must be one of auto, arima, prophet',
  })
  model?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  refresh?: boolean;
}
