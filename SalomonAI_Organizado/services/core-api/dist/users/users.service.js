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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
let UsersService = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    async findByUid(uid) {
        return this.usersRepository.findOne({
            where: { uid },
            relations: ['bankAccounts', 'financialMovements', 'classificationRules', 'notifications', 'transactions'],
        });
    }
    async findByEmail(email) {
        return this.usersRepository.findOne({
            where: { email },
            relations: ['bankAccounts', 'financialMovements', 'classificationRules', 'notifications', 'transactions'],
        });
    }
    async findById(id) {
        return this.usersRepository.findOne({
            where: { id },
            relations: ['bankAccounts', 'financialMovements', 'classificationRules', 'notifications', 'transactions'],
        });
    }
    async createFromFirebase(firebaseUser) {
        const user = this.usersRepository.create({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified || false,
            phoneNumber: firebaseUser.phoneNumber,
            metadata: firebaseUser.metadata,
            fullName: firebaseUser.displayName,
            roles: ['user'],
            isActive: true,
            preferences: {
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
            },
        });
        return this.usersRepository.save(user);
    }
    async update(id, updateData) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        Object.assign(user, updateData);
        return this.usersRepository.save(user);
    }
    async updateLastSignIn(uid, lastSignInTime) {
        await this.usersRepository.update({ uid }, {
            metadata: {
                lastSignInTime,
            },
        });
    }
    async syncWithFirebase(firebaseUser) {
        let user = await this.findByUid(firebaseUser.uid);
        if (!user && firebaseUser.email) {
            user = await this.findByEmail(firebaseUser.email);
        }
        if (!user) {
            return this.createFromFirebase(firebaseUser);
        }
        user.uid = firebaseUser.uid;
        user.email = firebaseUser.email;
        user.displayName = firebaseUser.displayName;
        user.photoURL = firebaseUser.photoURL;
        user.emailVerified = firebaseUser.emailVerified || false;
        user.phoneNumber = firebaseUser.phoneNumber;
        user.metadata = firebaseUser.metadata;
        try {
            return await this.usersRepository.save(user);
        }
        catch (error) {
            const errorCode = error?.code ?? error?.driverError?.code;
            if (errorCode === '23505' && firebaseUser.email) {
                const existingByEmail = await this.findByEmail(firebaseUser.email);
                if (existingByEmail) {
                    existingByEmail.uid = firebaseUser.uid;
                    existingByEmail.email = firebaseUser.email;
                    existingByEmail.displayName = firebaseUser.displayName;
                    existingByEmail.photoURL = firebaseUser.photoURL;
                    existingByEmail.emailVerified = firebaseUser.emailVerified || false;
                    existingByEmail.phoneNumber = firebaseUser.phoneNumber;
                    existingByEmail.metadata = firebaseUser.metadata;
                    return this.usersRepository.save(existingByEmail);
                }
            }
            throw error;
        }
    }
    async deactivate(id) {
        await this.usersRepository.update(id, { isActive: false });
    }
    async activate(id) {
        await this.usersRepository.update(id, { isActive: true });
    }
    async findAll(limit = 100, offset = 0) {
        const [users, total] = await this.usersRepository.findAndCount({
            skip: offset,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return { users, total };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map