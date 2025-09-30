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
        this.userRelations = [
            'bankAccounts',
            'financialMovements',
            'classificationRules',
            'notifications',
            'transactions',
        ];
    }
    async findByUid(uid) {
        return this.usersRepository.findOne({
            where: { uid },
            relations: [...this.userRelations],
        });
    }
    async findByEmail(email) {
        return this.usersRepository.findOne({
            where: { email },
            relations: [...this.userRelations],
        });
    }
    async findById(id) {
        return this.usersRepository.findOne({
            where: { id },
            relations: [...this.userRelations],
        });
    }
    async createFromFirebase(firebaseUser, repository = this.usersRepository) {
        const email = firebaseUser.email?.trim();
        if (!email) {
            throw new Error('Firebase user email is required to create an account.');
        }
        const user = repository.create({
            uid: firebaseUser.uid,
            email,
            displayName: firebaseUser.displayName ?? email,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified ?? false,
            phoneNumber: firebaseUser.phoneNumber,
            metadata: firebaseUser.metadata,
            fullName: firebaseUser.displayName ?? email,
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
        return repository.save(user);
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
        if (!firebaseUser?.uid) {
            throw new Error('Firebase user UID is required to sync the account.');
        }
        const email = firebaseUser.email?.trim();
        return this.usersRepository.manager.transaction(async (manager) => {
            const repository = manager.getRepository(user_entity_1.User);
            const loadUser = async (where) => repository.findOne({
                where,
                relations: [...this.userRelations],
            });
            let user = await loadUser({ uid: firebaseUser.uid });
            if (!user && email) {
                user = await loadUser({ email });
            }
            if (!user) {
                return this.createFromFirebase({ ...firebaseUser, email: email ?? firebaseUser.email }, repository);
            }
            user.uid = firebaseUser.uid;
            if (email) {
                user.email = email;
            }
            if (typeof firebaseUser.displayName !== 'undefined') {
                user.displayName = firebaseUser.displayName ?? user.displayName;
                user.fullName = firebaseUser.displayName ?? user.fullName;
            }
            if (typeof firebaseUser.photoURL !== 'undefined') {
                user.photoURL = firebaseUser.photoURL ?? user.photoURL;
            }
            if (typeof firebaseUser.emailVerified !== 'undefined') {
                user.emailVerified = firebaseUser.emailVerified;
            }
            if (typeof firebaseUser.phoneNumber !== 'undefined') {
                user.phoneNumber = firebaseUser.phoneNumber ?? user.phoneNumber;
            }
            if (firebaseUser.metadata) {
                user.metadata = {
                    ...(user.metadata ?? {}),
                    ...firebaseUser.metadata,
                };
            }
            return repository.save(user);
        });
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