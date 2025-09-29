import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { CreateDataInventoryDto } from './dto/create-data-inventory.dto';
import { UpdateDataInventoryStatusDto } from './dto/update-data-inventory-status.dto';
import { CreateRetentionPolicyDto } from './dto/create-retention-policy.dto';
import { UpdateRetentionPolicyDto } from './dto/update-retention-policy.dto';
import { LogConsentDto } from './dto/log-consent.dto';
import { UpdateConsentStatusDto } from './dto/update-consent-status.dto';
import { SyncCookiePreferencesDto } from './dto/sync-cookie-preferences.dto';
import { CreateDsarRequestDto } from './dto/create-dsar-request.dto';
import { ResolveDsarRequestDto } from './dto/resolve-dsar-request.dto';
import { DataInventoryStatus } from './entities/data-inventory.entity';
import { DsarRequestType } from './entities/dsar-request.entity';

@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('inventory')
  getInventory(
    @Query('dataSubjectId') dataSubjectId?: string,
    @Query('dataCategory') dataCategory?: string,
    @Query('status') status?: DataInventoryStatus,
  ) {
    return this.privacyService.getDataInventory({
      dataSubjectId,
      dataCategory,
      status,
    });
  }

  @Post('inventory')
  createInventory(@Body() dto: CreateDataInventoryDto) {
    return this.privacyService.createDataInventory(dto);
  }

  @Patch('inventory/:id/status')
  updateInventoryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDataInventoryStatusDto,
  ) {
    return this.privacyService.updateDataInventoryStatus(id, dto);
  }

  @Get('retention-policies')
  getRetentionPolicies() {
    return this.privacyService.getRetentionPolicies();
  }

  @Post('retention-policies')
  createRetentionPolicy(@Body() dto: CreateRetentionPolicyDto) {
    return this.privacyService.createRetentionPolicy(dto);
  }

  @Patch('retention-policies/:id')
  updateRetentionPolicy(@Param('id') id: string, @Body() dto: UpdateRetentionPolicyDto) {
    return this.privacyService.updateRetentionPolicy(id, dto);
  }

  @Get('consents')
  getConsents(@Query('userId') userId?: string) {
    return this.privacyService.getConsentLogs(userId);
  }

  @Post('consents')
  logConsent(@Body() dto: LogConsentDto) {
    return this.privacyService.logConsent(dto);
  }

  @Patch('consents/:id')
  updateConsent(@Param('id') id: string, @Body() dto: UpdateConsentStatusDto) {
    return this.privacyService.updateConsentStatus(id, dto);
  }

  @Post('consents/sync-preferences')
  syncCookiePreferences(@Body() dto: SyncCookiePreferencesDto) {
    return this.privacyService.syncCookiePreferences(dto);
  }

  @Get('consents/preferences/:userId')
  getCookiePreferences(@Param('userId') userId: string) {
    return this.privacyService.getCookiePreferences(userId);
  }

  @Get('dsar')
  listDsar(@Query('userId') userId?: string) {
    return this.privacyService.listDsarRequests(userId);
  }

  @Post('dsar/access')
  requestAccess(@Body() dto: CreateDsarRequestDto) {
    return this.privacyService.requestAccess({ ...dto, type: DsarRequestType.ACCESS });
  }

  @Post('dsar/rectification')
  requestRectification(@Body() dto: CreateDsarRequestDto) {
    return this.privacyService.requestRectification({
      ...dto,
      type: DsarRequestType.RECTIFICATION,
    });
  }

  @Post('dsar/erasure')
  requestErasure(@Body() dto: CreateDsarRequestDto) {
    return this.privacyService.requestErasure({
      ...dto,
      type: DsarRequestType.ERASURE,
    });
  }

  @Patch('dsar/:id')
  resolveDsar(@Param('id') id: string, @Body() dto: ResolveDsarRequestDto) {
    return this.privacyService.resolveDsarRequest(id, dto);
  }

  @Post('jobs/run-retention-sweep')
  runRetentionSweep(@Body('actor') actor = 'api') {
    return this.privacyService.processRetentionSweep(actor);
  }

  @Get('audits')
  getAuditLogs(@Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number) {
    return this.privacyService.getAuditLogs(limit);
  }
}
