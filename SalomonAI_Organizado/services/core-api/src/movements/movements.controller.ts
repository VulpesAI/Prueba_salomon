import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { GetMovementsQueryDto } from './dto/get-movements-query.dto';
import { MovementsService } from './movements.service';
import { SupabaseJwtGuard } from '../auth/supabase.guard';

@UseGuards(SupabaseJwtGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get()
  list(@Query() query: GetMovementsQueryDto) {
    return this.movementsService.listMovements(query);
  }
}
