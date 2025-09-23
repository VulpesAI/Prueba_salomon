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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const financial_movements_service_1 = require("../financial-movements/financial-movements.service");
let DashboardController = class DashboardController {
    constructor(financialMovementsService) {
        this.financialMovementsService = financialMovementsService;
    }
    async getDashboardSummary(req) {
        const userId = req.user.id;
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const movementsResult = await this.financialMovementsService.findAllByUser(userId, {
            startDate: lastMonth.toISOString(),
            endDate: new Date().toISOString(),
            page: 1,
            limit: 1000,
        });
        const movements = movementsResult.data;
        const totalIncome = movements
            .filter(m => m.amount > 0)
            .reduce((sum, m) => sum + m.amount, 0);
        const totalExpenses = movements
            .filter(m => m.amount < 0)
            .reduce((sum, m) => sum + Math.abs(m.amount), 0);
        const balance = totalIncome - totalExpenses;
        const categoryBreakdown = movements.reduce((acc, movement) => {
            const category = movement.category || 'Sin categoría';
            if (!acc[category]) {
                acc[category] = {
                    total: 0,
                    count: 0,
                    type: movement.amount > 0 ? 'income' : 'expense',
                };
            }
            acc[category].total += Math.abs(movement.amount);
            acc[category].count += 1;
            return acc;
        }, {});
        const weeklyTrends = this.calculateWeeklyTrends(movements);
        return {
            summary: {
                totalIncome,
                totalExpenses,
                balance,
                transactionCount: movements.length,
                period: {
                    from: lastMonth.toISOString(),
                    to: new Date().toISOString(),
                },
            },
            categories: categoryBreakdown,
            trends: weeklyTrends,
            recentTransactions: movements
                .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
                .slice(0, 10)
                .map(m => ({
                id: m.id,
                description: m.description,
                amount: m.amount,
                category: m.category,
                date: m.transactionDate,
                currency: m.currency,
            })),
        };
    }
    async getMovements(req, page, limit, category, startDate, endDate) {
        const userId = req.user.id;
        const result = await this.financialMovementsService.findAllByUser(userId, {
            startDate,
            endDate,
            page,
            limit,
        });
        return {
            movements: result.data.map(m => ({
                id: m.id,
                description: m.description,
                amount: m.amount,
                category: m.category,
                date: m.transactionDate,
                currency: m.currency,
                type: m.amount > 0 ? 'income' : 'expense',
            })),
            pagination: result.meta,
        };
    }
    async getSpendingAnalysis(req, months) {
        const userId = req.user.id;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        const movementsResult = await this.financialMovementsService.findAllByUser(userId, {
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString(),
            page: 1,
            limit: 1000,
        });
        const movements = movementsResult.data;
        const categoryAnalysis = movements
            .filter(m => m.amount < 0)
            .reduce((acc, movement) => {
            const category = movement.category || 'Sin categoría';
            if (!acc[category]) {
                acc[category] = {
                    total: 0,
                    transactions: 0,
                    average: 0,
                    monthlyData: {},
                };
            }
            acc[category].total += Math.abs(movement.amount);
            acc[category].transactions += 1;
            const monthKey = new Date(movement.transactionDate).toISOString().substring(0, 7);
            if (!acc[category].monthlyData[monthKey]) {
                acc[category].monthlyData[monthKey] = 0;
            }
            acc[category].monthlyData[monthKey] += Math.abs(movement.amount);
            return acc;
        }, {});
        Object.keys(categoryAnalysis).forEach(category => {
            categoryAnalysis[category].average =
                categoryAnalysis[category].total / categoryAnalysis[category].transactions;
        });
        return {
            period: {
                months,
                from: startDate.toISOString(),
                to: new Date().toISOString(),
            },
            categories: categoryAnalysis,
            topCategories: Object.entries(categoryAnalysis)
                .sort(([, a], [, b]) => b.total - a.total)
                .slice(0, 5)
                .map(([name, data]) => ({ name, ...data })),
        };
    }
    calculateWeeklyTrends(movements) {
        const weeklyData = {};
        movements.forEach(movement => {
            const date = new Date(movement.transactionDate);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().substring(0, 10);
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    week: weekKey,
                    income: 0,
                    expenses: 0,
                    transactions: 0,
                };
            }
            if (movement.amount > 0) {
                weeklyData[weekKey].income += movement.amount;
            }
            else {
                weeklyData[weekKey].expenses += Math.abs(movement.amount);
            }
            weeklyData[weekKey].transactions += 1;
        });
        return Object.values(weeklyData)
            .sort((a, b) => a.week.localeCompare(b.week));
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardSummary", null);
__decorate([
    (0, common_1.Get)('movements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('category')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getMovements", null);
__decorate([
    (0, common_1.Get)('spending-analysis'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('months', new common_1.DefaultValuePipe(3), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSpendingAnalysis", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [financial_movements_service_1.FinancialMovementsService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map