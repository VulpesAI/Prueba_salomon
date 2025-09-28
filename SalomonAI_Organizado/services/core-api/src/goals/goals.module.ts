import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { FinancialGoal } from './entities/financial-goal.entity';
import { GoalProgress } from './entities/goal-progress.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialGoal, GoalProgress]), NotificationsModule, UserModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
