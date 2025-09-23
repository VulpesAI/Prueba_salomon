import {
  Body,
  Controller, BadRequestException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
  Post,
  Query,
} from '@nestjs/common';
import { FinancialMovementsService } from './financial-movements.service';
import { ClassifyMovementDto } from './dto/classify-movement.dto';
import { CreateFinancialMovementDto } from './dto/create-financial-movement.dto';
import { FindFinancialMovementsQueryDto } from './dto/find-financial-movements-query.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { UpdateFinancialMovementDto } from './dto/update-financial-movement.dto';

@Controller('financial-movements')
export class FinancialMovementsController {
  constructor(
    private readonly movementsService: FinancialMovementsService,
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  create(@Body() createDto: CreateFinancialMovementDto) {
    return this.movementsService.create(createDto);
  }

  @Post('classify')
  @UseGuards(JwtAuthGuard)
  async classifyMovement(@GetUser() user: User, @Body() classifyDto: Omit<ClassifyMovementDto, 'userId'>) {
    const payload = { ...classifyDto, userId: user.id };
    const category = await this.movementsService.classifyBySimilarity(payload);
    return { category };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAllByUser(
    @GetUser() user: User,
    @Query() queryDto: FindFinancialMovementsQueryDto,
  ) {
    return this.movementsService.findAllByUser(user.id, queryDto);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  getSummaryByUserAndPeriod(
    @GetUser() user: User,
    @Query() queryDto: FindFinancialMovementsQueryDto,
  ) {
    const { startDate, endDate } = queryDto;
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'Los parámetros startDate y endDate son requeridos para el resumen.',
      );
    }
    return this.movementsService.getSummaryByUserAndPeriod(user.id, new Date(startDate), new Date(endDate));
  }

  @Get('savings-potential')
  @UseGuards(JwtAuthGuard)
  getSavingsPotential(
    @GetUser() user: User,
    @Query('category') category: string,
  ) {
    if (!category) {
      throw new BadRequestException('El parámetro "category" es requerido.');
    }
    return this.movementsService.getSavingsPotential(user.id, category);
  }

  @Patch(':movementId')
  @UseGuards(JwtAuthGuard)
  updateCategory(
    @GetUser() user: User,
    @Param('movementId', ParseUUIDPipe) movementId: string,
    @Body() updateDto: Omit<UpdateFinancialMovementDto, 'userId'>,
  ) {
    const payload = { ...updateDto, userId: user.id };
    return this.movementsService.updateCategory(movementId, payload);
  }
}
