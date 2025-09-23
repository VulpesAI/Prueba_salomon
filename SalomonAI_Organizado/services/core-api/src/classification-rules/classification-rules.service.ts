import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserClassificationRule } from './entities/user-classification-rule.entity';
import { CreateClassificationRuleDto } from './dto/create-classification-rule.dto';
import { UpdateClassificationRuleDto } from './dto/update-classification-rule.dto';

@Injectable()
export class ClassificationRulesService {
  constructor(
    @InjectRepository(UserClassificationRule)
    private readonly ruleRepository: Repository<UserClassificationRule>,
  ) {}

  async create(userId: string, dto: CreateClassificationRuleDto): Promise<UserClassificationRule> {
    const rule = this.ruleRepository.create({
      user: { id: userId }, // Relacionar con el usuario
      ...dto,
    });
    return this.ruleRepository.save(rule);
  }

  async findAll(userId: string): Promise<UserClassificationRule[]> {
    return this.ruleRepository.find({
      where: { user: { id: userId } },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<UserClassificationRule> {
    const rule = await this.ruleRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!rule) {
      throw new NotFoundException('Regla de clasificación no encontrada');
    }

    return rule;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateClassificationRuleDto,
  ): Promise<UserClassificationRule> {
    const rule = await this.findOne(id, userId);
    Object.assign(rule, dto);
    return this.ruleRepository.save(rule);
  }

  async remove(id: string, userId: string): Promise<void> {
    const rule = await this.ruleRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!rule) {
      throw new NotFoundException('Regla de clasificación no encontrada');
    }

    await this.ruleRepository.remove(rule);
  }

  /**
   * Aplica las reglas de clasificación de un usuario a una transacción
   */
  async applyRules(
    userId: string,
    transaction: { description: string; amount: number },
  ): Promise<string | null> {
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

  /**
   * Verifica si una transacción coincide con una regla
   */
  private matchesRule(
    rule: UserClassificationRule,
    transaction: { description: string; amount: number },
  ): boolean {
    // Verificar palabra clave si existe
    if (rule.keyword && !transaction.description.toLowerCase().includes(rule.keyword.toLowerCase())) {
      return false;
    }

    return true; // La regla coincide
  }
}