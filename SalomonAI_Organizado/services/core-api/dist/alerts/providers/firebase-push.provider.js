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
var FirebasePushProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebasePushProvider = void 0;
const common_1 = require("@nestjs/common");
const firebase_admin_service_1 = require("../../firebase/firebase-admin.service");
let FirebasePushProvider = FirebasePushProvider_1 = class FirebasePushProvider {
    constructor(firebaseAdmin) {
        this.firebaseAdmin = firebaseAdmin;
        this.logger = new common_1.Logger(FirebasePushProvider_1.name);
    }
    async sendPush(token, title, body, data) {
        if (!token) {
            this.logger.warn('Missing FCM device token, skipping push notification.');
            return false;
        }
        try {
            await this.firebaseAdmin.getMessaging().send({
                token,
                notification: { title, body },
                data,
            });
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`FCM push dispatch failed: ${message}`);
            return false;
        }
    }
};
exports.FirebasePushProvider = FirebasePushProvider;
exports.FirebasePushProvider = FirebasePushProvider = FirebasePushProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_admin_service_1.FirebaseAdminService])
], FirebasePushProvider);
//# sourceMappingURL=firebase-push.provider.js.map