"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const user_module_1 = require("../users/user.module");
const firebase_module_1 = require("../firebase/firebase.module");
const jwt_strategy_1 = require("./jwt.strategy");
const local_strategy_1 = require("./local.strategy");
const firebase_auth_strategy_1 = require("./firebase-auth.strategy");
const auth_token_entity_1 = require("./entities/auth-token.entity");
const token_service_1 = require("./token.service");
const security_module_1 = require("../security/security.module");
const oauth_controller_1 = require("./oauth.controller");
const oauth_service_1 = require("./oauth.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            user_module_1.UserModule,
            firebase_module_1.FirebaseModule,
            security_module_1.SecurityModule,
            typeorm_1.TypeOrmModule.forFeature([auth_token_entity_1.AuthToken]),
            passport_1.PassportModule,
            config_1.ConfigModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: (() => {
                            const raw = Number(configService.get('JWT_ACCESS_TOKEN_TTL_SECONDS', '900'));
                            return Number.isNaN(raw) ? 900 : raw;
                        })(),
                    },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController, oauth_controller_1.OAuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, local_strategy_1.LocalStrategy, firebase_auth_strategy_1.FirebaseAuthStrategy, token_service_1.TokenService, oauth_service_1.OAuthService],
        exports: [auth_service_1.AuthService, token_service_1.TokenService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map