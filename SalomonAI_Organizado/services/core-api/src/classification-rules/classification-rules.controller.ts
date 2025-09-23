import { Controller } from '@nestjs/common';
import { ClassificationRulesService } from './classification-rules.service';

@Controller('classification-rules')
export class ClassificationRulesController {
  constructor(private readonly classificationRulesService: ClassificationRulesService) {}
}