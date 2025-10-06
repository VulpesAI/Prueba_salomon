import { IsObject, IsOptional, IsString } from 'class-validator';

export class ResolveIntentDto {
  @IsString()
  intent!: string;

  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
