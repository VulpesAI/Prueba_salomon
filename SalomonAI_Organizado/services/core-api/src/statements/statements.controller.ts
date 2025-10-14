import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';

import { SupabaseJwtGuard } from '../auth/supabase.guard';
import { CreateStatementDto } from './dto/create-statement.dto';
import { GetStatementsQueryDto } from './dto/get-statements-query.dto';
import {
  GetStatementTransactionsParamsDto,
  GetStatementTransactionsQueryDto,
} from './dto/get-statement-transactions.dto';
import { StatementsService } from './statements.service';

@UseGuards(SupabaseJwtGuard)
@Controller('statements')
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadStatement(
    @Body() body: CreateStatementDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const statement = await this.statementsService.createStatement(body, file);
    return { statement };
  }

  @Get()
  async listStatements(@Query() query: GetStatementsQueryDto) {
    const statements = await this.statementsService.listStatements(query);
    return { statements };
  }

  @Get(':id/transactions')
  async getStatementTransactions(
    @Param() params: GetStatementTransactionsParamsDto,
    @Query() query: GetStatementTransactionsQueryDto,
  ) {
    return this.statementsService.getStatementTransactions(params, query);
  }
}
