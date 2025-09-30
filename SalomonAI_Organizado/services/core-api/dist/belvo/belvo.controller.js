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
exports.BelvoController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const belvo_service_1 = require("./belvo.service");
const bank_connection_service_1 = require("./bank-connection.service");
let BelvoController = class BelvoController {
    constructor(belvoService, bankConnectionService) {
        this.belvoService = belvoService;
        this.bankConnectionService = bankConnectionService;
    }
    async getInstitutions(country = 'CL') {
        const institutions = await this.belvoService.getInstitutions(country);
        return {
            institutions: institutions.map(inst => ({
                id: inst.id,
                name: inst.display_name,
                type: inst.type,
                logo: inst.logo,
                website: inst.website,
                primaryColor: inst.primary_color,
                countryCodes: inst.country_codes,
            })),
        };
    }
    async createConnection(req, body) {
        const dto = {
            userId: req.user.id,
            institution: body.institution,
            username: body.username,
            password: body.password,
        };
        const connection = await this.bankConnectionService.createConnection(dto);
        return {
            connection: {
                id: connection.id,
                institutionName: connection.institutionName,
                institutionType: connection.institutionType,
                status: connection.status,
                accountsCount: connection.accountsCount,
                createdAt: connection.createdAt,
                lastAccessedAt: connection.lastAccessedAt,
                isHealthy: connection.isHealthy,
            },
        };
    }
    async createWidgetToken(req) {
        const session = await this.belvoService.createWidgetSession(req.user.id);
        return {
            token: session.access,
            refreshToken: session.refresh ?? null,
            expiresIn: session.expires_in ?? null,
        };
    }
    async createConnectionFromWidget(req, body) {
        if (!body?.linkId) {
            throw new common_1.BadRequestException('linkId es requerido');
        }
        const connection = await this.bankConnectionService.createConnectionFromLink(req.user.id, body.linkId);
        return {
            connection: {
                id: connection.id,
                institutionName: connection.institutionName,
                institutionType: connection.institutionType,
                status: connection.status,
                accountsCount: connection.accountsCount,
                createdAt: connection.createdAt,
                lastAccessedAt: connection.lastAccessedAt,
                isHealthy: connection.isHealthy,
            },
        };
    }
    async getUserConnections(req) {
        const connections = await this.bankConnectionService.getUserConnections(req.user.id);
        return {
            connections: connections.map(conn => ({
                id: conn.id,
                institutionName: conn.institutionName,
                institutionType: conn.institutionType,
                status: conn.status,
                accountsCount: conn.accountsCount,
                lastSyncAt: conn.lastSyncAt,
                createdAt: conn.createdAt,
                isHealthy: conn.isHealthy,
                needsSync: conn.needsSync,
                metadata: {
                    logo: conn.metadata?.institutionLogo,
                    website: conn.metadata?.institutionWebsite,
                    primaryColor: conn.metadata?.institutionPrimaryColor,
                },
            })),
        };
    }
    async getConnection(req, connectionId) {
        const connection = await this.bankConnectionService.getConnection(connectionId, req.user.id);
        return {
            connection: {
                id: connection.id,
                institutionName: connection.institutionName,
                institutionType: connection.institutionType,
                status: connection.status,
                accountsCount: connection.accountsCount,
                connectedAccounts: connection.connectedAccounts,
                lastSyncAt: connection.lastSyncAt,
                syncFrequencyHours: connection.syncFrequencyHours,
                autoSyncEnabled: connection.autoSyncEnabled,
                errorCount: connection.errorCount,
                lastError: connection.lastError,
                createdAt: connection.createdAt,
                lastAccessedAt: connection.lastAccessedAt,
                isHealthy: connection.isHealthy,
                needsSync: connection.needsSync,
                metadata: connection.metadata,
            },
        };
    }
    async syncConnection(req, connectionId, days) {
        await this.bankConnectionService.getConnection(connectionId, req.user.id);
        const result = await this.bankConnectionService.syncTransactions(connectionId, days);
        return {
            sync: result,
        };
    }
    async checkConnectionStatus(req, connectionId) {
        await this.bankConnectionService.getConnection(connectionId, req.user.id);
        const connection = await this.bankConnectionService.checkConnectionStatus(connectionId);
        return {
            status: {
                id: connection.id,
                status: connection.status,
                isHealthy: connection.isHealthy,
                lastAccessedAt: connection.lastAccessedAt,
                errorCount: connection.errorCount,
                lastError: connection.lastError,
            },
        };
    }
    async deleteConnection(req, connectionId) {
        await this.bankConnectionService.deleteConnection(connectionId, req.user.id);
    }
    async syncAllConnections(req) {
        const results = await this.bankConnectionService.syncUserConnections(req.user.id);
        return {
            syncResults: results,
            summary: {
                totalConnections: results.length,
                successfulSyncs: results.filter(r => r.success).length,
                totalTransactionsSynced: results.reduce((sum, r) => sum + r.transactionsSynced, 0),
                totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
            },
        };
    }
    async getConnectionStats(req) {
        const stats = await this.bankConnectionService.getUserConnectionStats(req.user.id);
        return {
            stats,
        };
    }
    async getConnectionAccounts(req, connectionId) {
        const connection = await this.bankConnectionService.getConnection(connectionId, req.user.id);
        const accounts = await this.belvoService.getAccounts(connection.belvoLinkId);
        return {
            accounts: accounts.map(account => ({
                id: account.id,
                name: account.name,
                number: account.number,
                type: account.type,
                category: account.category,
                currency: account.currency,
                balance: account.balance,
                lastAccessedAt: account.last_accessed_at,
                bankProductId: account.bank_product_id,
                publicIdentification: {
                    name: account.public_identification_name,
                    value: account.public_identification_value,
                },
            })),
        };
    }
    async getConnectionBalances(req, connectionId) {
        const connection = await this.bankConnectionService.getConnection(connectionId, req.user.id);
        const balances = await this.belvoService.getBalances(connection.belvoLinkId);
        return {
            balances: balances.map(balance => ({
                account: balance.account,
                current: balance.current_balance,
                available: balance.available_balance,
                currency: balance.currency,
                collectedAt: balance.collected_at,
            })),
        };
    }
};
exports.BelvoController = BelvoController;
__decorate([
    (0, common_1.Get)('institutions'),
    __param(0, (0, common_1.Query)('country')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "getInstitutions", null);
__decorate([
    (0, common_1.Post)('connections'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "createConnection", null);
__decorate([
    (0, common_1.Post)('widget/token'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "createWidgetToken", null);
__decorate([
    (0, common_1.Post)('widget/connections'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "createConnectionFromWidget", null);
__decorate([
    (0, common_1.Get)('connections'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "getUserConnections", null);
__decorate([
    (0, common_1.Get)('connections/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "getConnection", null);
__decorate([
    (0, common_1.Post)('connections/:id/sync'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('days', new common_1.DefaultValuePipe(30), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "syncConnection", null);
__decorate([
    (0, common_1.Post)('connections/:id/status'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "checkConnectionStatus", null);
__decorate([
    (0, common_1.Delete)('connections/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "deleteConnection", null);
__decorate([
    (0, common_1.Post)('sync-all'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "syncAllConnections", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "getConnectionStats", null);
__decorate([
    (0, common_1.Get)('connections/:id/accounts'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "getConnectionAccounts", null);
__decorate([
    (0, common_1.Get)('connections/:id/balances'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BelvoController.prototype, "getConnectionBalances", null);
exports.BelvoController = BelvoController = __decorate([
    (0, common_1.Controller)('belvo'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [belvo_service_1.BelvoService,
        bank_connection_service_1.BankConnectionService])
], BelvoController);
//# sourceMappingURL=belvo.controller.js.map