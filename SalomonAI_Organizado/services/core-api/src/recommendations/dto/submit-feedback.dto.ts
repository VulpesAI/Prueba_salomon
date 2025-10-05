import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitRecommendationFeedbackDto {
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
