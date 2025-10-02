"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryTokenStore = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let InMemoryTokenStore = class InMemoryTokenStore {
    constructor() {
        this.tokens = new Map();
    }
    async createRefreshToken(user, refreshTokenHash, expiresAt) {
        const id = (0, crypto_1.randomUUID)();
        this.tokens.set(id, {
            id,
            user: {
                id: user.id,
                email: user.email,
                roles: user.roles ?? ['user'],
                uid: user.uid,
            },
            refreshTokenHash,
            expiresAt,
            revokedAt: null,
            rotatedAt: null,
        });
        return { id };
    }
    async findRefreshTokenById(id) {
        const entry = this.tokens.get(id);
        if (!entry) {
            return null;
        }
        return { ...entry, user: { ...entry.user } };
    }
    async markRotated(id, rotatedAt) {
        const entry = this.tokens.get(id);
        if (!entry) {
            return;
        }
        this.tokens.set(id, { ...entry, rotatedAt });
    }
    async revokeTokensForUser(userId) {
        for (const [key, value] of this.tokens.entries()) {
            if (value.user.id === userId) {
                this.tokens.set(key, { ...value, revokedAt: new Date() });
            }
        }
    }
};
exports.InMemoryTokenStore = InMemoryTokenStore;
exports.InMemoryTokenStore = InMemoryTokenStore = __decorate([
    (0, common_1.Injectable)()
], InMemoryTokenStore);
//# sourceMappingURL=in-memory-token.store.js.map