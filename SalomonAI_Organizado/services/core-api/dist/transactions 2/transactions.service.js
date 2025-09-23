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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transaction_entity_1 = require("./entities/transaction.entity");
const financial_account_entity_1 = require("./entities/financial-account.entity");
const classification_service_1 = require("../classification/classification.service");
let TransactionsService = class TransactionsService {
    constructor(transactionRepository, accountRepository, classificationService) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.classificationService = classificationService;
    }
    async create(createTransactionDto) {
        const account = await this.accountRepository.findOne({
            where: { id: createTransactionDto.accountId },
        });
        if (!account) {
            throw new common_1.NotFoundException('Account not found');
        }
        if (account.userId !== createTransactionDto.userId) {
            throw new common_1.BadRequestException('Account does not belong to user');
        }
        const classificationResult = await this.classificationService.classifyTransaction({
            description: createTransactionDto.description,
        });
        const transaction = this.transactionRepository.create({
            ...createTransactionDto,
            category: classificationResult.category,
            status: 'COMPLETED',
        });
        await this.transactionRepository.save(transaction);
        const amountChange = createTransactionDto.type === 'EXPENSE' ? -createTransactionDto.amount : createTransactionDto.amount;
        await this.accountRepository.update(account.id, {
            balance: account.balance + amountChange,
        });
        return transaction;
    }
    async findAll(userId, filters = {}) {
        const where = { userId };
        if (filters.startDate && filters.endDate) {
            where.date = (0, typeorm_2.Between)(filters.startDate, filters.endDate);
        }
        if (filters.type) {
            where.type = filters.type;
        }
        if (filters.category) {
            where.category = filters.category;
        }
        if (filters.accountId) {
            where.accountId = filters.accountId;
        }
        if (filters.status) {
            where.status = filters.status;
        }
        return this.transactionRepository.find({
            where,
            order: { date: 'DESC' },
            relations: ['account'],
        });
    }
    async update(id, userId, updateTransactionDto) {
        const transaction = await this.transactionRepository.findOne({
            where: { id, userId },
            relations: ['account'],
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        if (updateTransactionDto.description) {
            const classificationResult = await this.classificationService.classifyTransaction({
                description: updateTransactionDto.description,
            });
            updateTransactionDto.category = classificationResult.category;
        }
        if (updateTransactionDto.amount !== undefined) {
            const amountDifference = (transaction.type === 'EXPENSE' ? -1 : 1) *
                (updateTransactionDto.amount - transaction.amount);
            await this.accountRepository.update(transaction.accountId, {
                balance: () => `balance + ${amountDifference}`,
            });
        }
        Object.assign(transaction, updateTransactionDto);
        return this.transactionRepository.save(transaction);
    }
    async remove(id, userId) {
        const transaction = await this.transactionRepository.findOne({
            where: { id, userId },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        const amountChange = transaction.type === 'EXPENSE' ? transaction.amount : -transaction.amount;
        await this.accountRepository.update(transaction.accountId, {
            balance: () => `balance + ${amountChange}`,
        });
        await this.transactionRepository.remove(transaction);
    }
    async getStatistics(userId, startDate, endDate) {
        const transactions = await this.transactionRepository.find({
            where: {
                userId,
                date: (0, typeorm_2.Between)(startDate, endDate),
            },
        });
        const stats = {
            totalIncome: 0,
            totalExpense: 0,
            byCategory: {},
        };
        for (const transaction of transactions) {
            if (transaction.type === 'INCOME') {
                stats.totalIncome += transaction.amount;
            }
            else if (transaction.type === 'EXPENSE') {
                stats.totalExpense += transaction.amount;
                stats.byCategory[transaction.category] =
                    (stats.byCategory[transaction.category] || 0) + transaction.amount;
            }
        }
        return stats;
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __param(1, (0, typeorm_1.InjectRepository)(financial_account_entity_1.FinancialAccount)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        classification_service_1.ClassificationService])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map