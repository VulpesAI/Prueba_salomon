import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassificationRulesService } from './classification-rules.service';
import { ClassificationRulesController } from './classification-rules.controller';
import { UserClassificationRule } from './entities/user-classification-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserClassificationRule])],
  controllers: [ClassificationRulesController],
  providers: [ClassificationRulesService],
})
export class ClassificationRulesModule {}

