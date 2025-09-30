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
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const bcrypt = require("bcryptjs");
let UserService = UserService_1 = class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
        this.logger = new common_1.Logger(UserService_1.name);
    }
    async create(createUserDto) {
        this.logger.log('Attempting to create a new user...');
        const { password, ...userData } = createUserDto;
        try {
            this.logger.log('Generating salt...');
            const salt = await bcrypt.genSalt();
            this.logger.log('Hashing password...');
            const passwordHash = await bcrypt.hash(password, salt);
            this.logger.log('Password hashed successfully.');
            this.logger.log('Creating user entity...');
            const user = this.userRepository.create({ ...userData, passwordHash });
            this.logger.log('User entity created. Saving to database...');
            const savedUser = await this.userRepository.save(user);
            this.logger.log(`User saved successfully with ID: ${savedUser.id}`);
            return savedUser;
        }
        catch (error) {
            this.logger.error('Error during user creation process', error.stack);
            throw new common_1.InternalServerErrorException('Failed to create user due to an internal error.');
        }
    }
    findAll() {
        return this.userRepository.find();
    }
    async findOne(id) {
        const user = await this.userRepository.findOneBy({ id });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${id}" not found`);
        }
        return user;
    }
    async findByEmail(email) {
        return this.userRepository
            .createQueryBuilder('user')
            .addSelect(['user.passwordHash', 'user.mfaSecret', 'user.mfaTempSecret', 'user.mfaBackupCodes'])
            .where('user.email = :email', { email })
            .getOne();
    }
    async getByIdWithSecrets(id) {
        return this.userRepository
            .createQueryBuilder('user')
            .addSelect(['user.mfaSecret', 'user.mfaTempSecret', 'user.mfaBackupCodes'])
            .where('user.id = :id', { id })
            .getOne();
    }
    async setMfaTempSecret(userId, secret) {
        await this.userRepository.update({ id: userId }, { mfaTempSecret: secret });
    }
    async activateMfa(userId, secret, backupCodes) {
        await this.userRepository.update({ id: userId }, {
            mfaSecret: secret,
            mfaEnabled: true,
            mfaTempSecret: null,
            mfaBackupCodes: backupCodes,
            lastMfaAt: new Date(),
        });
    }
    async updateMfaUsage(userId) {
        await this.userRepository.update({ id: userId }, { lastMfaAt: new Date() });
    }
    async disableMfa(userId) {
        await this.userRepository.update({ id: userId }, {
            mfaEnabled: false,
            mfaSecret: null,
            mfaTempSecret: null,
            mfaBackupCodes: null,
            lastMfaAt: null,
        });
    }
    async consumeBackupCode(userId, code) {
        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect(['user.mfaBackupCodes'])
            .where('user.id = :userId', { userId })
            .getOne();
        if (!user?.mfaBackupCodes?.length) {
            return false;
        }
        for (let i = 0; i < user.mfaBackupCodes.length; i++) {
            const storedHash = user.mfaBackupCodes[i];
            if (storedHash && (await bcrypt.compare(code, storedHash))) {
                const updatedCodes = [...user.mfaBackupCodes];
                updatedCodes.splice(i, 1);
                await this.userRepository.update({ id: userId }, { mfaBackupCodes: updatedCodes });
                return true;
            }
        }
        return false;
    }
    async upsertOAuthUser(params) {
        let user = await this.userRepository.findOne({ where: { email: params.email } });
        if (!user) {
            user = this.userRepository.create({
                email: params.email,
                fullName: params.fullName ?? params.displayName ?? params.email,
                displayName: params.displayName ?? params.fullName ?? params.email,
                photoURL: params.picture,
                roles: ['user'],
                isActive: true,
                emailVerified: true,
                oauthProviders: [
                    {
                        provider: params.provider,
                        subject: params.subject,
                        picture: params.picture,
                        lastLoginAt: new Date().toISOString(),
                    },
                ],
            });
        }
        else {
            user.oauthProviders = user.oauthProviders ?? [];
            const providerIndex = user.oauthProviders.findIndex(p => p.provider === params.provider);
            const providerEntry = {
                provider: params.provider,
                subject: params.subject,
                picture: params.picture,
                lastLoginAt: new Date().toISOString(),
            };
            if (providerIndex >= 0) {
                user.oauthProviders[providerIndex] = providerEntry;
            }
            else {
                user.oauthProviders.push(providerEntry);
            }
            user.fullName = params.fullName ?? user.fullName;
            user.displayName = params.displayName ?? user.displayName ?? user.fullName;
            user.photoURL = params.picture ?? user.photoURL;
            user.emailVerified = true;
        }
        const saved = await this.userRepository.save(user);
        return saved;
    }
    async update(id, updateUserDto) {
        const user = await this.userRepository.preload({ id, ...updateUserDto });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${id}" not found`);
        }
        return this.userRepository.save(user);
    }
    async remove(id) {
        const result = await this.userRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`User with ID "${id}" not found`);
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map