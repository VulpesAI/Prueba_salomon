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
exports.FirebaseAuthStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const firebase_admin_service_1 = require("../firebase/firebase-admin.service");
const users_service_1 = require("../users/users.service");
let FirebaseAuthStrategy = class FirebaseAuthStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'firebase-auth') {
    constructor(firebaseAdminService, usersService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: null,
            passReqToCallback: true,
        });
        this.firebaseAdminService = firebaseAdminService;
        this.usersService = usersService;
    }
    async validate(req, payload) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                throw new common_1.UnauthorizedException('No authorization header');
            }
            const token = authHeader.replace('Bearer ', '');
            const decodedToken = await this.firebaseAdminService.verifyIdToken(token);
            let user = await this.usersService.findByUid(decodedToken.uid);
            if (!user) {
                user = await this.usersService.createFromFirebase({
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    displayName: decodedToken.name,
                    photoURL: decodedToken.picture,
                    emailVerified: decodedToken.email_verified,
                    phoneNumber: decodedToken.phone_number,
                });
            }
            return {
                id: user.id,
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                roles: user.roles || ['user'],
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException(`Authentication failed: ${error.message}`);
        }
    }
};
exports.FirebaseAuthStrategy = FirebaseAuthStrategy;
exports.FirebaseAuthStrategy = FirebaseAuthStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_admin_service_1.FirebaseAdminService,
        users_service_1.UsersService])
], FirebaseAuthStrategy);
//# sourceMappingURL=firebase-auth.strategy.js.map