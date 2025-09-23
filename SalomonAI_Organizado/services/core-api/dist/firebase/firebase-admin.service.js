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
exports.FirebaseAdminService = void 0;
const common_1 = require("@nestjs/common");
const admin = require("firebase-admin");
const config_1 = require("@nestjs/config");
let FirebaseAdminService = class FirebaseAdminService {
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        if (!admin.apps.length) {
            const serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT_KEY');
            this.app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount ? JSON.parse(serviceAccount) : {
                    type: 'service_account',
                    project_id: this.configService.get('FIREBASE_PROJECT_ID'),
                    private_key_id: this.configService.get('FIREBASE_PRIVATE_KEY_ID'),
                    private_key: this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
                    client_email: this.configService.get('FIREBASE_CLIENT_EMAIL'),
                    client_id: this.configService.get('FIREBASE_CLIENT_ID'),
                    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                    token_uri: 'https://oauth2.googleapis.com/token',
                    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                    client_x509_cert_url: this.configService.get('FIREBASE_CLIENT_CERT_URL'),
                }),
                databaseURL: this.configService.get('FIREBASE_DATABASE_URL'),
            });
        }
        else {
            this.app = admin.apps[0];
        }
    }
    getApp() {
        return this.app;
    }
    getAuth() {
        return this.app.auth();
    }
    async verifyIdToken(idToken) {
        try {
            return await this.getAuth().verifyIdToken(idToken);
        }
        catch (error) {
            throw new Error(`Token verification failed: ${error.message}`);
        }
    }
    async getUserByUid(uid) {
        try {
            return await this.getAuth().getUser(uid);
        }
        catch (error) {
            throw new Error(`User not found: ${error.message}`);
        }
    }
    async createCustomToken(uid, additionalClaims) {
        try {
            return await this.getAuth().createCustomToken(uid, additionalClaims);
        }
        catch (error) {
            throw new Error(`Custom token creation failed: ${error.message}`);
        }
    }
};
exports.FirebaseAdminService = FirebaseAdminService;
exports.FirebaseAdminService = FirebaseAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FirebaseAdminService);
//# sourceMappingURL=firebase-admin.service.js.map