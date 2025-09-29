import {
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  private isPrivacyAdmin(user: User): boolean {
    return (
      Array.isArray(user?.roles) &&
      user.roles.some((role) => role === 'admin' || role === 'dpo')
    );
  }

  private ensurePrivacyAdmin(user: User): void {
    if (!this.isPrivacyAdmin(user)) {
      throw new ForbiddenException('Solo el DPO o un administrador puede realizar esta acción.');
    }
  }

  private resolveActor(user: User): string {
    return user?.email ?? user?.id ?? 'api';
  }

  @Get('inventory')
  getInventory(
    @Request() req: { user: User },
    @Query('dataSubjectId') dataSubjectId?: string,
    @Query('dataCategory') dataCategory?: string,
    @Query('status') status?: DataInventoryStatus,
  ) {
    const user = req.user;
    const isAdmin = this.isPrivacyAdmin(user);
    if (!isAdmin && dataSubjectId && dataSubjectId !== user.id) {
      throw new ForbiddenException('No puedes consultar inventarios de otros usuarios.');
    }

    return this.privacyService.getDataInventory({
      dataSubjectId: dataSubjectId ?? (isAdmin ? undefined : user.id),
      dataCategory,
      status,
    });
  }

  @Post('inventory')
  createInventory(@Request() req: { user: User }, @Body() dto: CreateDataInventoryDto) {
    const user = req.user;
    this.ensurePrivacyAdmin(user);
    return this.privacyService.createDataInventory({
      ...dto,
      requestedBy: this.resolveActor(user),
    });
  }

  @Patch('inventory/:id/status')
  updateInventoryStatus(
    @Param('id') id: string,
    @Request() req: { user: User },
    @Body() dto: UpdateDataInventoryStatusDto,
  ) {
    const user = req.user;
    this.ensurePrivacyAdmin(user);
    return this.privacyService.updateDataInventoryStatus(id, {
      ...dto,
      requestedBy: this.resolveActor(user),
    });
  }

  @Get('retention-policies')
  getRetentionPolicies(@Request() req: { user: User }) {
    this.ensurePrivacyAdmin(req.user);
    return this.privacyService.getRetentionPolicies();
  }

  @Post('retention-policies')
  createRetentionPolicy(
    @Request() req: { user: User },
    @Body() dto: CreateRetentionPolicyDto,
  ) {
    const user = req.user;
    this.ensurePrivacyAdmin(user);
    return this.privacyService.createRetentionPolicy({
      ...dto,
      requestedBy: this.resolveActor(user),
    });
  }

  @Patch('retention-policies/:id')
  updateRetentionPolicy(
    @Param('id') id: string,
    @Request() req: { user: User },
    @Body() dto: UpdateRetentionPolicyDto,
  ) {
    const user = req.user;
    this.ensurePrivacyAdmin(user);
    return this.privacyService.updateRetentionPolicy(id, {
      ...dto,
      requestedBy: this.resolveActor(user),
    });
  }

  @Get('consents')
  getConsents(@Request() req: { user: User }, @Query('userId') userId?: string) {
    const user = req.user;
    const isAdmin = this.isPrivacyAdmin(user);
    if (!isAdmin && userId && userId !== user.id) {
      throw new ForbiddenException('No puedes consultar consentimientos de otros usuarios.');
    }

    return this.privacyService.getConsentLogs(userId ?? (isAdmin ? undefined : user.id));
  }

  @Post('consents')
  logConsent(@Request() req: { user: User }, @Body() dto: LogConsentDto) {
    const user = req.user;
    const isAdmin = this.isPrivacyAdmin(user);
    if (!isAdmin && dto.userId && dto.userId !== user.id) {
      throw new ForbiddenException('No puedes registrar consentimientos de otros usuarios.');
    }

    return this.privacyService.logConsent({
      ...dto,
      userId: dto.userId ?? user.id,
      requestedBy: this.resolveActor(user),
    });
  }

  @Patch('consents/:id')
  async updateConsent(
    @Param('id') id: string,
    @Request() req: { user: User },
    @Body() dto: UpdateConsentStatusDto,
  ) {
    const user = req.user;
    const isAdmin = this.isPrivacyAdmin(user);
    const consent = await this.privacyService.getConsentLogById(id);
    if (!consent) {
      return this.privacyService.updateConsentStatus(id, {
        ...dto,
        requestedBy: this.resolveActor(user),
      });
    }

    if (!isAdmin && consent.userId !== user.id) {
      throw new ForbiddenException('No puedes modificar consentimientos de otros usuarios.');
    }

    return this.privacyService.updateConsentStatus(id, {
      ...dto,
      requestedBy: this.resolveActor(user),
    });
  }

  @Post('consents/sync-preferences')
  syncCookiePreferences(
    @Request() req: { user: User },
    @Body() dto: SyncCookiePreferencesDto,
  ) {
    const user = req.user;
    const isAdmin = this.isPrivacyAdmin(user);
    if (!isAdmin && dto.userId && dto.userId !== user.id) {
      throw new ForbiddenException('No puedes sincronizar preferencias de otros usuarios.');
    }

    return this.privacyService.syncCookiePreferences({
      ...dto,
      userId: dto.userId ?? user.id,
      requestedBy: this.resolveActor(user),
    });
  }

  @Get('consents/preferences/:userId')
  getCookiePreferences(@Request() req: { user: User }, @Param('userId') userId: string) {
    const user = req.user;
    if (!this.isPrivacyAdmin(user) && user.id !== userId) {
      throw new ForbiddenException('No puedes consultar preferencias de otros usuarios.');
    }

    return this.privacyService.getCookiePreferences(userId);
  }

  @Get('dsar')
  listDsar(@Request() req: { user: User }, @Query('userId') userId?: string) {
    const user = req.user;
    const isAdmin = this.isPrivacyAdmin(user);
    if (!isAdmin && userId && userId !== user.id) {
      throw new ForbiddenException('No puedes consultar solicitudes de otros usuarios.');
    }

    return this.privacyService.listDsarRequests(userId ?? (isAdmin ? undefined : user.id));
  }

  @Post('dsar/access')
  requestAccess(@Request() req: { user: User }, @Body() dto: CreateDsarRequestDto) {
    const user = req.user;
    const isAdmin = this.isPrivacyAdmin(user);
    if (!isAdmin && dto.userId && dto.userId !== user.id) {
      throw new ForbiddenException('No puedes crear solicitudes para otros usuarios.');
    }

    return this.privacyService.requestAccess({
      ...dto,
      userId: dto.userId ?? user.id,
      requestedBy: this.resolveActor(user),
      type: DsarRequestType.ACCESS,
    });
  }

  @Post('dsar/rectification')
  requestRectification(@Request() req: { user: User }, @Body() dto: CreateDsarRequestDto) {
    const user = req.user;
    const isAdmin = this.isPrivacyAdmin(user);
    if (!isAdmin && dto.userId && dto.userId !== user.id) {
      throw new ForbiddenException('No puedes crear solicitudes para otros usuarios.');
    }

    return this.privacyService.requestRectification({
      ...dto,
      userId: dto.userId ?? user.id,
      requestedBy: this.resolveActor(user),
      type: DsarRequestType.RECTIFICATION,
    });
  }

  @Post('dsar/erasure')
  requestErasure(@Request() req: { user: User }, @Body() dto: CreateDsarRequestDto) {
    const user = req.user;
    const isAdmin = this.isPrivacyAdmin(user);
    if (!isAdmin && dto.userId && dto.userId !== user.id) {
      throw new ForbiddenException('No puedes crear solicitudes para otros usuarios.');
    }

    return this.privacyService.requestErasure({
      ...dto,
      userId: dto.userId ?? user.id,
      requestedBy: this.resolveActor(user),
      type: DsarRequestType.ERASURE,
    });
  }

  @Patch('dsar/:id')
  resolveDsar(
    @Param('id') id: string,
    @Request() req: { user: User },
    @Body() dto: ResolveDsarRequestDto,
  ) {
    const user = req.user;
    this.ensurePrivacyAdmin(user);
    return this.privacyService.resolveDsarRequest(id, {
      ...dto,
      completedBy: dto.completedBy ?? this.resolveActor(user),
    });
  }

  @Post('jobs/run-retention-sweep')
  runRetentionSweep(@Request() req: { user: User }, @Body('actor') actor = 'api') {
    const user = req.user;
    this.ensurePrivacyAdmin(user);
    const resolvedActor = actor === 'api' ? this.resolveActor(user) : actor;
    return this.privacyService.processRetentionSweep(resolvedActor);
  }

  @Get('audits')
  getAuditLogs(
    @Request() req: { user: User },
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    this.ensurePrivacyAdmin(req.user);
    return this.privacyService.getAuditLogs(limit);
  }
}
