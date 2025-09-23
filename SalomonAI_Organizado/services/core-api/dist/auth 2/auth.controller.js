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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const local_auth_guard_1 = require("./local-auth.guard");
const create_user_dto_1 = require("../users/dto/create-user.dto");
const firebase_admin_service_1 = require("../firebase/firebase-admin.service");
const users_service_1 = require("../users/users.service");
let AuthController = class AuthController {
    constructor(authService, firebaseAdminService, usersService) {
        this.authService = authService;
        this.firebaseAdminService = firebaseAdminService;
        this.usersService = usersService;
    }
    async register(createUserDto) {
        return this.authService.register(createUserDto);
    }
    async login(req) {
        return this.authService.login(req.user);
    }
    async firebaseLogin(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Token Firebase requerido');
        }
        const firebaseToken = authHeader.substring(7);
        try {
            const decodedToken = await this.firebaseAdminService.verifyIdToken(firebaseToken);
            const firebaseUser = await this.firebaseAdminService.getUserByUid(decodedToken.uid);
            const user = await this.usersService.syncWithFirebase({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                emailVerified: firebaseUser.emailVerified,
                phoneNumber: firebaseUser.phoneNumber,
                metadata: {
                    creationTime: firebaseUser.metadata.creationTime,
                    lastSignInTime: firebaseUser.metadata.lastSignInTime,
                },
            });
            const jwtToken = await this.authService.generateJwtToken({
                id: user.id,
                email: user.email,
                uid: user.uid,
                roles: user.roles,
            });
            return {
                access_token: jwtToken,
                user: {
                    id: user.id,
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified,
                    phoneNumber: user.phoneNumber,
                    roles: user.roles,
                    preferences: user.preferences,
                },
            };
        }
        catch (error) {
            console.error('Error en login Firebase:', error);
            throw new common_1.UnauthorizedException('Token Firebase inválido');
        }
    }
    async verifyFirebaseToken(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Token Firebase requerido');
        }
        const firebaseToken = authHeader.substring(7);
        try {
            const decodedToken = await this.firebaseAdminService.verifyIdToken(firebaseToken);
            const user = await this.usersService.findByUid(decodedToken.uid);
            return {
                valid: true,
                uid: decodedToken.uid,
                user: user ? {
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified,
                    roles: user.roles,
                } : null,
            };
        }
        catch (error) {
            return {
                valid: false,
                error: 'Token inválido',
            };
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.UseGuards)(local_auth_guard_1.LocalAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('firebase/login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "firebaseLogin", null);
__decorate([
    (0, common_1.Post)('firebase/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyFirebaseToken", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        firebase_admin_service_1.FirebaseAdminService,
        users_service_1.UsersService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map