import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class MuteNotificationDto {
  @IsString()
  eventKey: string;

  @IsOptional()
  @IsISO8601()
  until?: string;
}
