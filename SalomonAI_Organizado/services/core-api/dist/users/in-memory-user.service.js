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
exports.InMemoryUserService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const crypto_1 = require("crypto");
const in_memory_user_store_1 = require("./in-memory-user.store");
let InMemoryUserService = class InMemoryUserService {
    constructor(store) {
        this.store = store;
    }
    async create(createUserDto) {
        const hashed = await bcrypt.hash(createUserDto.password, 10);
        return this.store.save({
            id: (0, crypto_1.randomUUID)(),
            uid: null,
            email: createUserDto.email,
            passwordHash: hashed,
            fullName: createUserDto.fullName ?? createUserDto.email,
            displayName: createUserDto.fullName ?? createUserDto.email,
            photoURL: null,
            emailVerified: false,
            phoneNumber: null,
            metadata: {},
            roles: ['user'],
            isActive: true,
            mfaEnabled: false,
            mfaSecret: null,
            mfaTempSecret: null,
            mfaBackupCodes: null,
            preferences: undefined,
            profile: undefined,
            movements: [],
            classificationRules: [],
            notifications: [],
            transactions: [],
            goals: [],
            authTokens: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    async findAll() {
        return this.store.list();
    }
    async findOne(id) {
        const user = this.store.findById(id);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${id}" not found`);
        }
        return user;
    }
    async findByEmail(email) {
        return this.store.findByEmail(email);
    }
    async getByIdWithSecrets(id) {
        return this.store.findById(id);
    }
    async setMfaTempSecret(userId, secret) {
        const user = this.store.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${userId}" not found`);
        }
        this.store.save({ ...user, mfaTempSecret: secret });
    }
    async activateMfa(userId, secret, backupCodes) {
        const user = this.store.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${userId}" not found`);
        }
        this.store.save({
            ...user,
            mfaSecret: secret,
            mfaEnabled: true,
            mfaTempSecret: null,
            mfaBackupCodes: backupCodes,
            lastMfaAt: new Date(),
        });
    }
    async updateMfaUsage(userId) {
        const user = this.store.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${userId}" not found`);
        }
        this.store.save({ ...user, lastMfaAt: new Date() });
    }
    async disableMfa(userId) {
        const user = this.store.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${userId}" not found`);
        }
        this.store.save({
            ...user,
            mfaEnabled: false,
            mfaSecret: null,
            mfaTempSecret: null,
            mfaBackupCodes: null,
            lastMfaAt: null,
        });
    }
    async consumeBackupCode(userId, code) {
        const user = this.store.findById(userId);
        if (!user?.mfaBackupCodes?.length) {
            return false;
        }
        for (let i = 0; i < user.mfaBackupCodes.length; i++) {
            const storedHash = user.mfaBackupCodes[i];
            if (storedHash && (await bcrypt.compare(code, storedHash))) {
                const updatedCodes = [...user.mfaBackupCodes];
                updatedCodes.splice(i, 1);
                this.store.save({ ...user, mfaBackupCodes: updatedCodes });
                return true;
            }
        }
        return false;
    }
    async upsertOAuthUser(params) {
        return this.store.upsertOAuthUser(params);
    }
    async update(id, updateUserDto) {
        const user = this.store.findById(id);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${id}" not found`);
        }
        return this.store.save({ ...user, ...updateUserDto });
    }
    async remove(id) {
        const user = this.store.findById(id);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${id}" not found`);
        }
        this.store.remove(id);
    }
};
exports.InMemoryUserService = InMemoryUserService;
exports.InMemoryUserService = InMemoryUserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [in_memory_user_store_1.InMemoryUserStore])
], InMemoryUserService);
//# sourceMappingURL=in-memory-user.service.js.map