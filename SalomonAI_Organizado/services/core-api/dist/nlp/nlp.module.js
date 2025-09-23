"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NlpModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const cache_manager_1 = require("@nestjs/cache-manager");
const nlp_service_1 = require("./nlp.service");
const nlp_controller_1 = require("./nlp.controller");
let NlpModule = class NlpModule {
};
exports.NlpModule = NlpModule;
exports.NlpModule = NlpModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            cache_manager_1.CacheModule.register({
                ttl: 3600,
                max: 500,
            }),
        ],
        controllers: [nlp_controller_1.NlpController],
        providers: [nlp_service_1.NlpService],
        exports: [nlp_service_1.NlpService],
    })
], NlpModule);
//# sourceMappingURL=nlp.module.js.map