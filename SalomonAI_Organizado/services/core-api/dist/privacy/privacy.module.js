"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const privacy_service_1 = require("./privacy.service");
const privacy_controller_1 = require("./privacy.controller");
const data_inventory_entity_1 = require("./entities/data-inventory.entity");
const retention_policy_entity_1 = require("./entities/retention-policy.entity");
const consent_log_entity_1 = require("./entities/consent-log.entity");
const dsar_request_entity_1 = require("./entities/dsar-request.entity");
const cookie_preference_entity_1 = require("./entities/cookie-preference.entity");
const privacy_audit_log_entity_1 = require("./entities/privacy-audit-log.entity");
let PrivacyModule = class PrivacyModule {
};
exports.PrivacyModule = PrivacyModule;
exports.PrivacyModule = PrivacyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                data_inventory_entity_1.DataInventory,
                retention_policy_entity_1.RetentionPolicy,
                consent_log_entity_1.ConsentLog,
                dsar_request_entity_1.DsarRequest,
                cookie_preference_entity_1.CookiePreference,
                privacy_audit_log_entity_1.PrivacyAuditLog,
            ]),
        ],
        providers: [privacy_service_1.PrivacyService],
        controllers: [privacy_controller_1.PrivacyController],
        exports: [privacy_service_1.PrivacyService],
    })
], PrivacyModule);
//# sourceMappingURL=privacy.module.js.map