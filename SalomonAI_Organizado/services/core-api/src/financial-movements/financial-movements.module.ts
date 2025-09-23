import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialMovementsService } from './financial-movements.service';
import { FinancialMovementsController } from './financial-movements.controller';
import { FinancialMovement } from './entities/financial-movement.entity';
import { User } from '../users/entities/user.entity';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialMovement, User]),
    QdrantModule,
  ],
  controllers: [FinancialMovementsController],
  providers: [FinancialMovementsService],
  exports: [FinancialMovementsService],
})
export class FinancialMovementsModule {}