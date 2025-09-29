import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, IsIn } from 'class-validator';

import { NotificationChannel } from '../interfaces/notification.types';

export class NotificationHistoryQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['email', 'push', 'sms', 'in_app'], {
    message: 'channel must be one of email, push, sms or in_app',
  })
  channel?: NotificationChannel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
