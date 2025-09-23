import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BelvoService } from './belvo.service';
import { BelvoController } from './belvo.controller';
import { BankConnectionService } from './bank-connection.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankConnection } from './entities/bank-connection.entity';
import { FinancialMovementsModule } from '../financial-movements/financial-movements.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
    TypeOrmModule.forFeature([BankConnection]),
    FinancialMovementsModule,
  ],
  controllers: [BelvoController],
  providers: [BelvoService, BankConnectionService],
  exports: [BelvoService, BankConnectionService],
})
export class BelvoModule {}
