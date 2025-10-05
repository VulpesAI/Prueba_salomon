import { IsString } from 'class-validator';

export class GetRecommendationHistoryDto {
  @IsString()
  userId!: string;
}
