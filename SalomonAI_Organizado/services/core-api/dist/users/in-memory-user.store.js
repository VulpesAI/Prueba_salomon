"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryUserStore = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const buildDefaultPreferences = () => ({
    currency: 'CLP',
    timezone: 'America/Santiago',
    language: 'es',
    notifications: {
        email: true,
        push: true,
        sms: false,
    },
    privacy: {
        shareData: false,
        analytics: true,
    },
});
let InMemoryUserStore = class InMemoryUserStore {
    constructor() {
        this.users = new Map();
    }
    clone(user) {
        return {
            ...user,
            metadata: user.metadata ? { ...user.metadata } : undefined,
            roles: user.roles ? [...user.roles] : undefined,
            preferences: user.preferences ? JSON.parse(JSON.stringify(user.preferences)) : undefined,
            oauthProviders: user.oauthProviders ? user.oauthProviders.map((provider) => ({ ...provider })) : undefined,
            mfaBackupCodes: user.mfaBackupCodes ? [...user.mfaBackupCodes] : undefined,
        };
    }
    list() {
        return Array.from(this.users.values()).map((user) => this.clone(user));
    }
    findById(id) {
        const user = this.users.get(id);
        return user ? this.clone(user) : null;
    }
    findByEmail(email) {
        const user = Array.from(this.users.values()).find((item) => item.email === email);
        return user ? this.clone(user) : null;
    }
    findByUid(uid) {
        const user = Array.from(this.users.values()).find((item) => item.uid === uid);
        return user ? this.clone(user) : null;
    }
    save(user) {
        const now = new Date();
        const existing = this.users.get(user.id);
        const stored = {
            ...user,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        this.users.set(stored.id, stored);
        return this.clone(stored);
    }
    createFromFirebase(payload) {
        const existing = this.findByUid(payload.uid) ?? (payload.email ? this.findByEmail(payload.email) : null);
        const defaults = {
            displayName: payload.displayName,
            photoURL: payload.photoURL,
            emailVerified: payload.emailVerified ?? false,
            phoneNumber: payload.phoneNumber,
            metadata: payload.metadata ? { ...payload.metadata } : undefined,
            fullName: payload.displayName,
            roles: ['user'],
            isActive: true,
            preferences: buildDefaultPreferences(),
        };
        if (existing) {
            const merged = {
                ...existing,
                ...defaults,
                uid: payload.uid,
                email: payload.email,
            };
            return this.save(merged);
        }
        const created = {
            id: (0, crypto_1.randomUUID)(),
            uid: payload.uid,
            email: payload.email,
            passwordHash: null,
            fullName: payload.displayName,
            displayName: payload.displayName,
            photoURL: payload.photoURL,
            emailVerified: payload.emailVerified ?? false,
            phoneNumber: payload.phoneNumber,
            metadata: payload.metadata ? { ...payload.metadata } : undefined,
            roles: ['user'],
            isActive: true,
            mfaEnabled: false,
            preferences: buildDefaultPreferences(),
            profile: undefined,
            movements: [],
            classificationRules: [],
            notifications: [],
            transactions: [],
            goals: [],
            authTokens: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        return this.save(created);
    }
    syncWithFirebase(payload) {
        const user = this.createFromFirebase(payload);
        if (payload.metadata?.lastSignInTime) {
            user.metadata = user.metadata ?? {};
            user.metadata.lastSignInTime = payload.metadata.lastSignInTime;
            return this.save(user);
        }
        return user;
    }
    update(id, updateData) {
        const user = this.findById(id);
        if (!user) {
            throw new Error(`User with id ${id} not found`);
        }
        return this.save({ ...user, ...updateData });
    }
    updateLastSignIn(uid, lastSignInTime) {
        const user = this.findByUid(uid);
        if (!user) {
            return;
        }
        const metadata = user.metadata ?? {};
        metadata.lastSignInTime = lastSignInTime;
        this.save({ ...user, metadata });
    }
    deactivate(id) {
        const user = this.findById(id);
        if (!user) {
            return;
        }
        this.save({ ...user, isActive: false });
    }
    activate(id) {
        const user = this.findById(id);
        if (!user) {
            return;
        }
        this.save({ ...user, isActive: true });
    }
    upsertOAuthUser(params) {
        const existing = this.findByEmail(params.email);
        const now = new Date().toISOString();
        if (!existing) {
            return this.save({
                id: (0, crypto_1.randomUUID)(),
                uid: null,
                email: params.email,
                passwordHash: null,
                fullName: params.fullName ?? params.displayName ?? params.email,
                displayName: params.displayName ?? params.fullName ?? params.email,
                photoURL: params.picture,
                emailVerified: true,
                phoneNumber: null,
                metadata: {},
                roles: ['user'],
                isActive: true,
                mfaEnabled: false,
                mfaSecret: null,
                mfaTempSecret: null,
                mfaBackupCodes: null,
                preferences: buildDefaultPreferences(),
                profile: undefined,
                movements: [],
                classificationRules: [],
                notifications: [],
                transactions: [],
                goals: [],
                authTokens: [],
                oauthProviders: [
                    {
                        provider: params.provider,
                        subject: params.subject,
                        picture: params.picture,
                        lastLoginAt: now,
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        const providers = existing.oauthProviders ? [...existing.oauthProviders] : [];
        const index = providers.findIndex((item) => item.provider === params.provider);
        const providerEntry = {
            provider: params.provider,
            subject: params.subject,
            picture: params.picture,
            lastLoginAt: now,
        };
        if (index >= 0) {
            providers[index] = providerEntry;
        }
        else {
            providers.push(providerEntry);
        }
        return this.save({
            ...existing,
            oauthProviders: providers,
            fullName: params.fullName ?? existing.fullName,
            displayName: params.displayName ?? existing.displayName ?? existing.fullName,
            photoURL: params.picture ?? existing.photoURL,
            emailVerified: true,
        });
    }
    remove(id) {
        this.users.delete(id);
    }
};
exports.InMemoryUserStore = InMemoryUserStore;
exports.InMemoryUserStore = InMemoryUserStore = __decorate([
    (0, common_1.Injectable)()
], InMemoryUserStore);
//# sourceMappingURL=in-memory-user.store.js.map