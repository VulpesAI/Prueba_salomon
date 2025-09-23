import { Repository } from 'typeorm';
import { UserClassificationRule } from './entities/user-classification-rule.entity';
import { CreateClassificationRuleDto } from './dto/create-classification-rule.dto';
import { UpdateClassificationRuleDto } from './dto/update-classification-rule.dto';
export declare class ClassificationRulesService {
    private readonly ruleRepository;
    constructor(ruleRepository: Repository<UserClassificationRule>);
    create(userId: string, dto: CreateClassificationRuleDto): Promise<UserClassificationRule>;
    findAll(userId: string): Promise<UserClassificationRule[]>;
    findOne(id: string, userId: string): Promise<UserClassificationRule>;
    update(id: string, userId: string, dto: UpdateClassificationRuleDto): Promise<UserClassificationRule>;
    remove(id: string, userId: string): Promise<void>;
    applyRules(userId: string, transaction: {
        description: string;
        amount: number;
    }): Promise<string | null>;
    private matchesRule;
}
