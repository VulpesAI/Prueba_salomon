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
var UserController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const uuid_1 = require("uuid");
const fs = require("fs/promises");
const path = require("path");
const platform_express_1 = require("@nestjs/platform-express");
const rxjs_1 = require("rxjs");
const user_service_1 = require("./user.service");
const update_user_dto_1 = require("./dto/update-user.dto");
const kafka_tokens_1 = require("../kafka/kafka.tokens");
const query_dto_1 = require("./dto/query.dto");
const config_1 = require("@nestjs/config");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const get_user_decorator_1 = require("../auth/decorators/get-user.decorator");
const user_entity_1 = require("./entities/user.entity");
let UserController = UserController_1 = class UserController {
    constructor(userService, kafkaService, configService, httpService) {
        this.userService = userService;
        this.kafkaService = kafkaService;
        this.configService = configService;
        this.httpService = httpService;
        this.logger = new common_1.Logger(UserController_1.name);
    }
    getProfile(user) {
        const { passwordHash, ...result } = user;
        return result;
    }
    updateProfile(user, updateUserDto) {
        return this.userService.update(user.id, updateUserDto);
    }
    deleteAccount(user) {
        return this.userService.remove(user.id);
    }
    async uploadDocument(user, file) {
        const uploadPath = this.configService.get('UPLOADS_PATH');
        if (!uploadPath) {
            throw new common_1.InternalServerErrorException('La ruta de carga de archivos no está configurada.');
        }
        const fileExtension = path.extname(file.originalname);
        const uniqueFileName = `${(0, uuid_1.v4)()}${fileExtension}`;
        const fullFilePath = path.join(uploadPath, uniqueFileName);
        await fs.mkdir(uploadPath, { recursive: true });
        await fs.writeFile(fullFilePath, file.buffer);
        const messagePayload = {
            type: 'file_document',
            userId: user.id,
            originalFileName: file.originalname,
            filePath: fullFilePath,
            mimeType: file.mimetype,
        };
        await this.kafkaService.produce({
            topic: this.configService.get('KAFKA_TOPIC'),
            messages: [{ value: JSON.stringify(messagePayload) }],
        });
        return { message: 'Documento recibido y en cola para procesamiento.' };
    }
    async handleQuery(user, queryDto) {
        const nlpEngineUrl = this.configService.get('NLP_ENGINE_URL');
        if (!nlpEngineUrl) {
            throw new common_1.InternalServerErrorException('La URL del servicio de NLP no está configurada.');
        }
        const payload = {
            userId: user.id,
            query: queryDto.query,
        };
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${nlpEngineUrl}/query`, payload));
        return response.data;
    }
    async syncAccounts(user) {
        const connectorUrl = this.configService.get('FINANCIAL_CONNECTOR_URL');
        if (!connectorUrl) {
            throw new common_1.InternalServerErrorException('La URL del servicio de conexión financiera no está configurada.');
        }
        (0, rxjs_1.firstValueFrom)(this.httpService.post(`${connectorUrl}/sync/${user.id}`)).catch((err) => {
            this.logger.error(`Error al iniciar la sincronización para el usuario ${user.id}`, err.stack);
        });
        return {
            message: 'Solicitud de sincronización recibida. Las transacciones se procesarán en segundo plano.',
        };
    }
    async getTaxAnalysis(user, year) {
        const taxEngineUrl = this.configService.get('TAX_ENGINE_URL');
        if (!taxEngineUrl) {
            throw new common_1.InternalServerErrorException('La URL del servicio de impuestos no está configurada.');
        }
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${taxEngineUrl}/analysis/${user.id}/${year}`));
        return response.data;
    }
    async getRecommendations(user) {
        const riskEngineUrl = this.configService.get('RISK_ENGINE_URL');
        const recommendationEngineUrl = this.configService.get('RECOMMENDATION_ENGINE_URL');
        if (!riskEngineUrl || !recommendationEngineUrl) {
            throw new common_1.InternalServerErrorException('Las URLs de los servicios de riesgo o recomendación no están configuradas.');
        }
        return { message: 'Funcionalidad de recomendaciones en desarrollo.' };
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Delete)('me'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "deleteAccount", null);
__decorate([
    (0, common_1.Post)('me/documents'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
            new common_1.FileTypeValidator({
                fileType: /(text\/csv|application\/pdf|application\/vnd.ms-excel|application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet)/,
            }),
        ],
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Post)('me/query'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, query_dto_1.QueryDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "handleQuery", null);
__decorate([
    (0, common_1.Post)('me/sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "syncAccounts", null);
__decorate([
    (0, common_1.Get)('me/tax-analysis/:year'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getTaxAnalysis", null);
__decorate([
    (0, common_1.Get)('me/recommendations'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getRecommendations", null);
exports.UserController = UserController = UserController_1 = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(1, (0, common_1.Inject)(kafka_tokens_1.KAFKA_SERVICE)),
    __metadata("design:paramtypes", [user_service_1.UserService, Object, config_1.ConfigService,
        axios_1.HttpService])
], UserController);
//# sourceMappingURL=user.controller.js.map