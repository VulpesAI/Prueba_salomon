"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationRulesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_classification_rule_entity_1 = require("./entities/user-classification-rule.entity");
let ClassificationRulesService = class ClassificationRulesService {
    constructor(ruleRepository) {
        this.ruleRepository = ruleRepository;
    }
    async create(userId, dto) {
        const rule = this.ruleRepository.create({
            user: { id: userId },
            ...dto,
        });
        return this.ruleRepository.save(rule);
    }
    async findAll(userId) {
        return this.ruleRepository.find({
            where: { user: { id: userId } },
            order: { id: 'DESC' },
        });
    }
    async findOne(id, userId) {
        const rule = await this.ruleRepository.findOne({
            where: { id, user: { id: userId } },
        });
        if (!rule) {
            throw new common_1.NotFoundException('Regla de clasificación no encontrada');
        }
        return rule;
    }
    async update(id, userId, dto) {
        const rule = await this.findOne(id, userId);
        Object.assign(rule, dto);
        return this.ruleRepository.save(rule);
    }
    async remove(id, userId) {
        const rule = await this.ruleRepository.findOne({
            where: { id, user: { id: userId } },
        });
        if (!rule) {
            throw new common_1.NotFoundException('Regla de clasificación no encontrada');
        }
        await this.ruleRepository.remove(rule);
    }
    async applyRules(userId, transaction) {
        const rules = await this.ruleRepository.find({
            where: { user: { id: userId } },
            order: { id: 'DESC' },
        });
        for (const rule of rules) {
            if (this.matchesRule(rule, transaction)) {
                return rule.category;
            }
        }
        return null;
    }
    matchesRule(rule, transaction) {
        if (rule.keyword && !transaction.description.toLowerCase().includes(rule.keyword.toLowerCase())) {
            return false;
        }
        return true;
    }
};
exports.ClassificationRulesService = ClassificationRulesService;
exports.ClassificationRulesService = ClassificationRulesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_classification_rule_entity_1.UserClassificationRule)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ClassificationRulesService);
//# sourceMappingURL=classification-rules.service.js.map