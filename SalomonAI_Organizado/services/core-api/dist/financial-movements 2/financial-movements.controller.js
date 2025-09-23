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
exports.FinancialMovementsController = void 0;
const common_1 = require("@nestjs/common");
const financial_movements_service_1 = require("./financial-movements.service");
const create_financial_movement_dto_1 = require("./dto/create-financial-movement.dto");
const find_financial_movements_query_dto_1 = require("./dto/find-financial-movements-query.dto");
const api_key_guard_1 = require("../guards/api-key.guard");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const get_user_decorator_1 = require("../auth/decorators/get-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
let FinancialMovementsController = class FinancialMovementsController {
    constructor(movementsService) {
        this.movementsService = movementsService;
    }
    create(createDto) {
        return this.movementsService.create(createDto);
    }
    async classifyMovement(user, classifyDto) {
        const payload = { ...classifyDto, userId: user.id };
        const category = await this.movementsService.classifyBySimilarity(payload);
        return { category };
    }
    findAllByUser(user, queryDto) {
        return this.movementsService.findAllByUser(user.id, queryDto);
    }
    getSummaryByUserAndPeriod(user, queryDto) {
        const { startDate, endDate } = queryDto;
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Los parámetros startDate y endDate son requeridos para el resumen.');
        }
        return this.movementsService.getSummaryByUserAndPeriod(user.id, new Date(startDate), new Date(endDate));
    }
    getSavingsPotential(user, category) {
        if (!category) {
            throw new common_1.BadRequestException('El parámetro "category" es requerido.');
        }
        return this.movementsService.getSavingsPotential(user.id, category);
    }
    updateCategory(user, movementId, updateDto) {
        const payload = { ...updateDto, userId: user.id };
        return this.movementsService.updateCategory(movementId, payload);
    }
};
exports.FinancialMovementsController = FinancialMovementsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_financial_movement_dto_1.CreateFinancialMovementDto]),
    __metadata("design:returntype", void 0)
], FinancialMovementsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('classify'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Object]),
    __metadata("design:returntype", Promise)
], FinancialMovementsController.prototype, "classifyMovement", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        find_financial_movements_query_dto_1.FindFinancialMovementsQueryDto]),
    __metadata("design:returntype", void 0)
], FinancialMovementsController.prototype, "findAllByUser", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        find_financial_movements_query_dto_1.FindFinancialMovementsQueryDto]),
    __metadata("design:returntype", void 0)
], FinancialMovementsController.prototype, "getSummaryByUserAndPeriod", null);
__decorate([
    (0, common_1.Get)('savings-potential'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], FinancialMovementsController.prototype, "getSavingsPotential", null);
__decorate([
    (0, common_1.Patch)(':movementId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('movementId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, Object]),
    __metadata("design:returntype", void 0)
], FinancialMovementsController.prototype, "updateCategory", null);
exports.FinancialMovementsController = FinancialMovementsController = __decorate([
    (0, common_1.Controller)('financial-movements'),
    __metadata("design:paramtypes", [financial_movements_service_1.FinancialMovementsService])
], FinancialMovementsController);
//# sourceMappingURL=financial-movements.controller.js.map