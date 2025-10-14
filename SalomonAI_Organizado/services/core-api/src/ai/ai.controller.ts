import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { AiService } from './ai.service';
import { ResolveIntentDto } from './dto/resolve-intent.dto';
import { AiSummaryQueryDto } from './dto/ai-summary-query.dto';
import { SupabaseJwtGuard } from '../auth/supabase.guard';

@UseGuards(SupabaseJwtGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('intents/resolve')
  resolveIntent(@Body() payload: ResolveIntentDto) {
    return this.aiService.resolveIntent(payload);
  }

  @Get('summary/:sessionId')
  getSummary(@Param('sessionId') sessionId: string, @Query() query: AiSummaryQueryDto) {
    return this.aiService.getSessionSummary(sessionId, query);
  }
}
