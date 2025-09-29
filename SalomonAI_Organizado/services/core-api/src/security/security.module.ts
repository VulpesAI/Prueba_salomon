import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KmsService } from './kms.service';
import { SiemLoggerService } from './siem-logger.service';

@Module({
  imports: [ConfigModule],
  providers: [KmsService, SiemLoggerService],
  exports: [KmsService, SiemLoggerService],
})
export class SecurityModule {}

