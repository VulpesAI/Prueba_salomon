"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BelvoModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const belvo_service_1 = require("./belvo.service");
const belvo_controller_1 = require("./belvo.controller");
const bank_connection_service_1 = require("./bank-connection.service");
const typeorm_1 = require("@nestjs/typeorm");
const bank_connection_entity_1 = require("./entities/bank-connection.entity");
const financial_movements_module_1 = require("../financial-movements/financial-movements.module");
let BelvoModule = class BelvoModule {
};
exports.BelvoModule = BelvoModule;
exports.BelvoModule = BelvoModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule.register({
                timeout: 10000,
                maxRedirects: 5,
            }),
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([bank_connection_entity_1.BankConnection]),
            financial_movements_module_1.FinancialMovementsModule,
        ],
        controllers: [belvo_controller_1.BelvoController],
        providers: [belvo_service_1.BelvoService, bank_connection_service_1.BankConnectionService],
        exports: [belvo_service_1.BelvoService, bank_connection_service_1.BankConnectionService],
    })
], BelvoModule);
//# sourceMappingURL=belvo.module.js.map