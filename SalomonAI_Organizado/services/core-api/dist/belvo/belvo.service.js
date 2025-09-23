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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BelvoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let BelvoService = class BelvoService {
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.environment = this.configService.get('BELVO_ENVIRONMENT', 'sandbox');
        this.baseUrl = this.environment === 'production'
            ? 'https://api.belvo.com'
            : 'https://sandbox.belvo.com';
        this.secretId = this.configService.get('BELVO_SECRET_ID');
        this.secretPassword = this.configService.get('BELVO_SECRET_PASSWORD');
        if (!this.secretId || !this.secretPassword) {
            throw new Error('Belvo credentials not configured. Please set BELVO_SECRET_ID and BELVO_SECRET_PASSWORD');
        }
    }
    getRequestConfig() {
        const auth = Buffer.from(`${this.secretId}:${this.secretPassword}`).toString('base64');
        return {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'User-Agent': 'SalomonAI/1.0',
            },
        };
    }
    async getInstitutions(countryCode = 'CL') {
        try {
            const config = this.getRequestConfig();
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/api/institutions/?country_code=${countryCode}`, config));
            return response.data.results;
        }
        catch (error) {
            throw new common_1.HttpException(`Error obteniendo instituciones: ${error.message}`, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async createLink(institution, username, password, externalId) {
        try {
            const config = this.getRequestConfig();
            const payload = {
                institution,
                username,
                password,
                ...(externalId && { external_id: externalId }),
            };
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/api/links/`, payload, config));
            return response.data;
        }
        catch (error) {
            throw new common_1.HttpException(`Error creando link bancario: ${error.response?.data?.message || error.message}`, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getAccounts(linkId) {
        try {
            const config = this.getRequestConfig();
            const payload = { link: linkId };
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/api/accounts/`, payload, config));
            return response.data;
        }
        catch (error) {
            throw new common_1.HttpException(`Error obteniendo cuentas: ${error.response?.data?.message || error.message}`, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getTransactions(linkId, dateFrom, dateTo, accountId) {
        try {
            const config = this.getRequestConfig();
            const payload = {
                link: linkId,
                ...(dateFrom && { date_from: dateFrom }),
                ...(dateTo && { date_to: dateTo }),
                ...(accountId && { account: accountId }),
            };
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/api/transactions/`, payload, config));
            return response.data;
        }
        catch (error) {
            throw new common_1.HttpException(`Error obteniendo transacciones: ${error.response?.data?.message || error.message}`, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getBalances(linkId, accountId) {
        try {
            const config = this.getRequestConfig();
            const payload = {
                link: linkId,
                ...(accountId && { account: accountId }),
            };
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/api/balances/`, payload, config));
            return response.data;
        }
        catch (error) {
            throw new common_1.HttpException(`Error obteniendo balances: ${error.response?.data?.message || error.message}`, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async deleteLink(linkId) {
        try {
            const config = this.getRequestConfig();
            await (0, rxjs_1.firstValueFrom)(this.httpService.delete(`${this.baseUrl}/api/links/${linkId}/`, config));
        }
        catch (error) {
            throw new common_1.HttpException(`Error eliminando link: ${error.response?.data?.message || error.message}`, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getLinkStatus(linkId) {
        try {
            const config = this.getRequestConfig();
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/api/links/${linkId}/`, config));
            return response.data;
        }
        catch (error) {
            throw new common_1.HttpException(`Error verificando link: ${error.response?.data?.message || error.message}`, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async syncRecentTransactions(linkId, days = 30) {
        const dateTo = new Date().toISOString().split('T')[0];
        const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        return this.getTransactions(linkId, dateFrom, dateTo);
    }
    convertBelvoTransaction(belvoTransaction, userId) {
        return {
            userId,
            description: belvoTransaction.description || 'Transacción bancaria',
            amount: belvoTransaction.amount,
            currency: belvoTransaction.currency,
            transactionDate: new Date(belvoTransaction.value_date),
            category: this.mapBelvoCategory(belvoTransaction.category),
            externalId: belvoTransaction.id,
            source: 'belvo',
            metadata: {
                belvoId: belvoTransaction.id,
                accountId: belvoTransaction.account,
                merchant: belvoTransaction.merchant,
                subcategory: belvoTransaction.subcategory,
                reference: belvoTransaction.reference,
                status: belvoTransaction.status,
                balance: belvoTransaction.balance,
            },
        };
    }
    mapBelvoCategory(belvoCategory) {
        const categoryMap = {
            'Food & Groceries': 'Alimentación',
            'Transportation': 'Transporte',
            'Shopping': 'Compras',
            'Entertainment': 'Entretenimiento',
            'Bills & Utilities': 'Servicios',
            'Health & Medical': 'Salud',
            'Education': 'Educación',
            'Travel': 'Viajes',
            'Investment': 'Inversiones',
            'Income': 'Ingresos',
            'Transfer': 'Transferencias',
            'ATM': 'Cajero Automático',
            'Fee': 'Comisiones',
            'Interest': 'Intereses',
        };
        return categoryMap[belvoCategory] || 'Otros';
    }
};
exports.BelvoService = BelvoService;
exports.BelvoService = BelvoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], BelvoService);
//# sourceMappingURL=belvo.service.js.map