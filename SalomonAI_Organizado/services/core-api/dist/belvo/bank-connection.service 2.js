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
exports.BankConnectionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bank_connection_entity_1 = require("./entities/bank-connection.entity");
const belvo_service_1 = require("./belvo.service");
const financial_movements_service_1 = require("../financial-movements/financial-movements.service");
let BankConnectionService = class BankConnectionService {
    constructor(bankConnectionRepository, belvoService, financialMovementsService) {
        this.bankConnectionRepository = bankConnectionRepository;
        this.belvoService = belvoService;
        this.financialMovementsService = financialMovementsService;
    }
    async createConnection(dto) {
        try {
            const belvoLink = await this.belvoService.createLink(dto.institution, dto.username, dto.password, dto.userId);
            const institutions = await this.belvoService.getInstitutions('CL');
            const institution = institutions.find(inst => inst.id === dto.institution);
            const bankConnection = this.bankConnectionRepository.create({
                userId: dto.userId,
                belvoLinkId: belvoLink.id,
                institutionName: institution?.display_name || 'Institución desconocida',
                institutionId: dto.institution,
                institutionType: institution?.type || 'bank',
                accessMode: belvoLink.access_mode,
                status: belvoLink.status,
                lastAccessedAt: new Date(belvoLink.last_accessed_at),
                metadata: {
                    institutionLogo: institution?.logo,
                    institutionWebsite: institution?.website,
                    institutionPrimaryColor: institution?.primary_color,
                    belvoInstitutionData: institution,
                },
            });
            const savedConnection = await this.bankConnectionRepository.save(bankConnection);
            await this.syncAccounts(savedConnection.id);
            return savedConnection;
        }
        catch (error) {
            throw new common_1.BadRequestException(`Error creando conexión bancaria: ${error.message}`);
        }
    }
    async getUserConnections(userId) {
        return this.bankConnectionRepository.find({
            where: { userId, isActive: true },
            order: { createdAt: 'DESC' },
        });
    }
    async getConnection(connectionId, userId) {
        const connection = await this.bankConnectionRepository.findOne({
            where: { id: connectionId, userId },
        });
        if (!connection) {
            throw new common_1.NotFoundException('Conexión bancaria no encontrada');
        }
        return connection;
    }
    async syncAccounts(connectionId) {
        const connection = await this.bankConnectionRepository.findOne({
            where: { id: connectionId },
        });
        if (!connection) {
            throw new common_1.NotFoundException('Conexión no encontrada');
        }
        try {
            const accounts = await this.belvoService.getAccounts(connection.belvoLinkId);
            connection.accountsCount = accounts.length;
            connection.connectedAccounts = accounts.map(account => account.id);
            connection.lastAccessedAt = new Date();
            await this.bankConnectionRepository.save(connection);
        }
        catch (error) {
            connection.incrementErrorCount(`Error sincronizando cuentas: ${error.message}`);
            await this.bankConnectionRepository.save(connection);
            throw error;
        }
    }
    async syncTransactions(connectionId, days = 30) {
        const connection = await this.bankConnectionRepository.findOne({
            where: { id: connectionId },
        });
        if (!connection) {
            throw new common_1.NotFoundException('Conexión no encontrada');
        }
        const result = {
            success: false,
            accountsSynced: 0,
            transactionsSynced: 0,
            errors: [],
        };
        try {
            const transactions = await this.belvoService.syncRecentTransactions(connection.belvoLinkId, days);
            for (const belvoTransaction of transactions) {
                try {
                    const internalTransaction = this.belvoService.convertBelvoTransaction(belvoTransaction, connection.userId);
                    await this.financialMovementsService.create(internalTransaction);
                    result.transactionsSynced++;
                }
                catch (error) {
                    result.errors.push(`Error procesando transacción ${belvoTransaction.id}: ${error.message}`);
                }
            }
            result.success = true;
            connection.updateSyncResults(result.accountsSynced, result.transactionsSynced, result.errors);
            await this.bankConnectionRepository.save(connection);
        }
        catch (error) {
            result.errors.push(`Error sincronizando transacciones: ${error.message}`);
            connection.incrementErrorCount(error.message);
            await this.bankConnectionRepository.save(connection);
        }
        return result;
    }
    async deleteConnection(connectionId, userId) {
        const connection = await this.getConnection(connectionId, userId);
        try {
            await this.belvoService.deleteLink(connection.belvoLinkId);
        }
        catch (error) {
            console.warn(`Error eliminando link de Belvo: ${error.message}`);
        }
        connection.isActive = false;
        await this.bankConnectionRepository.save(connection);
    }
    async checkConnectionStatus(connectionId) {
        const connection = await this.bankConnectionRepository.findOne({
            where: { id: connectionId },
        });
        if (!connection) {
            throw new common_1.NotFoundException('Conexión no encontrada');
        }
        try {
            const belvoLink = await this.belvoService.getLinkStatus(connection.belvoLinkId);
            connection.status = belvoLink.status;
            connection.lastAccessedAt = new Date(belvoLink.last_accessed_at);
            await this.bankConnectionRepository.save(connection);
        }
        catch (error) {
            connection.incrementErrorCount(`Error verificando estado: ${error.message}`);
            await this.bankConnectionRepository.save(connection);
        }
        return connection;
    }
    async getConnectionsNeedingSync() {
        const connections = await this.bankConnectionRepository.find({
            where: { isActive: true, autoSyncEnabled: true },
        });
        return connections.filter(connection => connection.needsSync);
    }
    async syncUserConnections(userId) {
        const connections = await this.getUserConnections(userId);
        const results = [];
        for (const connection of connections) {
            if (connection.isHealthy) {
                try {
                    const result = await this.syncTransactions(connection.id);
                    results.push(result);
                }
                catch (error) {
                    results.push({
                        success: false,
                        accountsSynced: 0,
                        transactionsSynced: 0,
                        errors: [error.message],
                    });
                }
            }
        }
        return results;
    }
    async getUserConnectionStats(userId) {
        const connections = await this.bankConnectionRepository.find({
            where: { userId },
        });
        const activeConnections = connections.filter(c => c.isActive);
        const healthyConnections = activeConnections.filter(c => c.isHealthy);
        const totalAccounts = activeConnections.reduce((sum, c) => sum + c.accountsCount, 0);
        const lastSyncDates = activeConnections
            .map(c => c.lastSyncAt)
            .filter(date => date !== null)
            .sort((a, b) => b.getTime() - a.getTime());
        return {
            totalConnections: connections.length,
            activeConnections: activeConnections.length,
            totalAccounts,
            lastSyncDate: lastSyncDates[0] || null,
            healthyConnections: healthyConnections.length,
        };
    }
};
exports.BankConnectionService = BankConnectionService;
exports.BankConnectionService = BankConnectionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bank_connection_entity_1.BankConnection)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        belvo_service_1.BelvoService,
        financial_movements_service_1.FinancialMovementsService])
], BankConnectionService);
//# sourceMappingURL=bank-connection.service.js.map