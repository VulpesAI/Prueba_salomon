import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { GenerateBelvoLinkTokenDto } from './dto/generate-link-token.dto';
import { TriggerBelvoSyncDto } from './dto/trigger-sync.dto';
import { BelvoService } from './belvo.service';
import { SupabaseJwtGuard } from '../auth/supabase.guard';

@UseGuards(SupabaseJwtGuard)
@Controller('belvo')
export class BelvoController {
  constructor(private readonly belvoService: BelvoService) {}

  @Get('status')
  getStatus() {
    return {
      enabled: this.belvoService.isEnabled(),
      baseUrl: this.belvoService.getBaseUrl(),
    };
  }

  @Post('links/token')
  generateLinkToken(@Body() dto: GenerateBelvoLinkTokenDto) {
    return this.belvoService.generateLinkToken(dto);
  }

  @Post('links/:linkId/sync')
  triggerSync(@Param('linkId') linkId: string, @Body() dto: TriggerBelvoSyncDto) {
    return this.belvoService.triggerSynchronization(linkId, dto);
  }
}
