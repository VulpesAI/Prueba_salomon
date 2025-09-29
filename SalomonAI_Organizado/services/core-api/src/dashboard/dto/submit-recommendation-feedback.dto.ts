import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitRecommendationFeedbackDto {
  @IsString()
  recommendationId: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
