import { Body, Controller, Get, Patch, Post, UseGuards, Param, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Controller('goals')
@UseGuards(JwtAuthGuard)
@ApiTags('Goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateGoalDto) {
    const userId = req.user.id;
    return this.goalsService.createGoal(userId, dto);
  }

  @Get()
  async findAll(@Request() req) {
    const userId = req.user.id;
    return this.goalsService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') goalId: string) {
    const userId = req.user.id;
    return this.goalsService.getGoalById(userId, goalId);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') goalId: string, @Body() dto: UpdateGoalDto) {
    const userId = req.user.id;
    return this.goalsService.updateGoal(userId, goalId, dto);
  }
}
