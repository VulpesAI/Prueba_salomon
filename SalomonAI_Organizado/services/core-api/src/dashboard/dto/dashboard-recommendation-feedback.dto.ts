import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class DashboardRecommendationFeedbackDto {
  @IsString()
  recommendationId!: string;

  @IsString()
  userId!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
