import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DashboardRecommendationsQueryDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  refresh?: boolean;
}
