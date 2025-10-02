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
exports.FinancialMovementsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const qdrant_tokens_1 = require("../qdrant/qdrant.tokens");
const financial_movement_entity_1 = require("./entities/financial-movement.entity");
const user_entity_1 = require("../users/entities/user.entity");
let FinancialMovementsService = class FinancialMovementsService {
    constructor(movementRepository, userRepository, qdrantService) {
        this.movementRepository = movementRepository;
        this.userRepository = userRepository;
        this.qdrantService = qdrantService;
    }
    async create(dto) {
        const user = await this.userRepository.findOneBy({ id: dto.userId });
        if (!user) {
            throw new common_1.NotFoundException(`Usuario con ID "${dto.userId}" no encontrado.`);
        }
        const newMovement = this.movementRepository.create({ ...dto, user });
        const savedMovement = await this.movementRepository.save(newMovement);
        if (dto.embedding) {
            await this.qdrantService.upsertPoint('financial_movements', {
                userId: user.id,
                category: dto.category,
                description: dto.description
            }, dto.embedding);
        }
        return savedMovement;
    }
    async classifyBySimilarity(dto) {
        const similarPoints = await this.qdrantService.search('financial_movements', dto.embedding, 5, 0.8);
        if (similarPoints.length > 0) {
            return similarPoints[0].payload.category || 'NO_CLASIFICADO';
        }
        return 'NO_CLASIFICADO';
    }
    async findAllByUser(userId, queryDto) {
        const { startDate, endDate, page = 1, limit = 10 } = queryDto;
        const queryBuilder = this.movementRepository
            .createQueryBuilder('movement')
            .innerJoin('movement.user', 'user')
            .where('user.id = :userId', { userId });
        if (startDate) {
            queryBuilder.andWhere('movement.transactionDate >= :startDate', {
                startDate,
            });
        }
        if (endDate) {
            queryBuilder.andWhere('movement.transactionDate <= :endDate', {
                endDate,
            });
        }
        queryBuilder
            .orderBy('movement.transactionDate', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [data, total] = await queryBuilder.getManyAndCount();
        return {
            data,
            meta: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
    async getSummaryByUserAndPeriod(userId, startDate, endDate) {
        const result = await this.movementRepository
            .createQueryBuilder('movement')
            .select('movement.category', 'category')
            .addSelect('SUM(movement.amount)', 'total')
            .where('movement.user_id = :userId', { userId })
            .andWhere('movement.transactionDate BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
        })
            .groupBy('movement.category')
            .orderBy('total', 'DESC')
            .getRawMany();
        return result.map((item) => ({
            ...item,
            total: parseFloat(item.total),
        }));
    }
    async getSavingsPotential(userId, category) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const result = await this.movementRepository
            .createQueryBuilder('movement')
            .select('SUM(movement.amount)', 'totalSpent')
            .addSelect("COUNT(DISTINCT(DATE_TRUNC('month', movement.transactionDate)))", 'monthsWithSpend')
            .where('movement.user_id = :userId', { userId })
            .andWhere('movement.category = :category', { category })
            .andWhere('movement.transactionDate >= :sixMonthsAgo', { sixMonthsAgo })
            .getRawOne();
        const totalSpent = parseFloat(result.totalSpent) || 0;
        const monthsWithSpend = parseInt(result.monthsWithSpend, 10) || 1;
        const potentialMonthlySavings = totalSpent / monthsWithSpend;
        return {
            potentialMonthlySavings: Math.round(potentialMonthlySavings),
        };
    }
    async updateCategory(movementId, dto) {
        const movement = await this.movementRepository.findOne({
            where: { id: movementId, user: { id: dto.userId } },
        });
        if (!movement) {
            throw new common_1.NotFoundException(`Movimiento con ID "${movementId}" no encontrado o no pertenece al usuario.`);
        }
        movement.category = dto.category;
        const updatedMovement = await this.movementRepository.save(movement);
        if (updatedMovement.embedding) {
            await this.qdrantService.upsertPoint('financial_movements', {
                userId: movement.user.id,
                category: updatedMovement.category,
                description: updatedMovement.description
            }, updatedMovement.embedding);
        }
        return updatedMovement;
    }
};
exports.FinancialMovementsService = FinancialMovementsService;
exports.FinancialMovementsService = FinancialMovementsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(financial_movement_entity_1.FinancialMovement)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, common_1.Inject)(qdrant_tokens_1.QDRANT_SERVICE)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, Object])
], FinancialMovementsService);
//# sourceMappingURL=financial-movements.service.js.map