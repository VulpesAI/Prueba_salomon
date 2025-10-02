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
exports.TypeormTokenStore = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const auth_token_entity_1 = require("../entities/auth-token.entity");
let TypeormTokenStore = class TypeormTokenStore {
    constructor(authTokenRepository) {
        this.authTokenRepository = authTokenRepository;
    }
    async createRefreshToken(user, refreshTokenHash, expiresAt) {
        const entity = this.authTokenRepository.create({
            user: { id: user.id },
            refreshTokenHash,
            expiresAt,
        });
        const saved = await this.authTokenRepository.save(entity);
        return { id: saved.id };
    }
    async findRefreshTokenById(id) {
        const token = await this.authTokenRepository
            .createQueryBuilder('token')
            .leftJoinAndSelect('token.user', 'user')
            .addSelect('token.refreshTokenHash')
            .where('token.id = :id', { id })
            .getOne();
        if (!token) {
            return null;
        }
        return {
            id: token.id,
            user: {
                id: token.user.id,
                email: token.user.email,
                roles: token.user.roles,
                uid: token.user.uid,
            },
            refreshTokenHash: token.refreshTokenHash,
            expiresAt: token.expiresAt,
            revokedAt: token.revokedAt,
            rotatedAt: token.rotatedAt,
        };
    }
    async markRotated(id, rotatedAt) {
        await this.authTokenRepository.update({ id }, { rotatedAt });
    }
    async revokeTokensForUser(userId) {
        await this.authTokenRepository.update({ user: { id: userId } }, { revokedAt: new Date() });
    }
};
exports.TypeormTokenStore = TypeormTokenStore;
exports.TypeormTokenStore = TypeormTokenStore = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(auth_token_entity_1.AuthToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TypeormTokenStore);
//# sourceMappingURL=typeorm-token.store.js.map