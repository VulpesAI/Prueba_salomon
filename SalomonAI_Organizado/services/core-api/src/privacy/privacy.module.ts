import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivacyService } from './privacy.service';
import { PrivacyController } from './privacy.controller';
import { DataInventory } from './entities/data-inventory.entity';
import { RetentionPolicy } from './entities/retention-policy.entity';
import { ConsentLog } from './entities/consent-log.entity';
import { DsarRequest } from './entities/dsar-request.entity';
import { CookiePreference } from './entities/cookie-preference.entity';
import { PrivacyAuditLog } from './entities/privacy-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataInventory,
      RetentionPolicy,
      ConsentLog,
      DsarRequest,
      CookiePreference,
      PrivacyAuditLog,
    ]),
  ],
  providers: [PrivacyService],
  controllers: [PrivacyController],
  exports: [PrivacyService],
})
export class PrivacyModule {}
