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
exports.InMemoryUsersService = void 0;
const common_1 = require("@nestjs/common");
const in_memory_user_store_1 = require("./in-memory-user.store");
let InMemoryUsersService = class InMemoryUsersService {
    constructor(store) {
        this.store = store;
    }
    async findByUid(uid) {
        return this.store.findByUid(uid);
    }
    async findByEmail(email) {
        return this.store.findByEmail(email);
    }
    async findById(id) {
        return this.store.findById(id);
    }
    async createFromFirebase(firebaseUser) {
        return this.store.createFromFirebase(firebaseUser);
    }
    async update(id, updateData) {
        return this.store.update(id, updateData);
    }
    async updateLastSignIn(uid, lastSignInTime) {
        this.store.updateLastSignIn(uid, lastSignInTime);
    }
    async syncWithFirebase(firebaseUser) {
        return this.store.syncWithFirebase(firebaseUser);
    }
    async deactivate(id) {
        this.store.deactivate(id);
    }
    async activate(id) {
        this.store.activate(id);
    }
    async findAll(limit = 100, offset = 0) {
        const users = this.store.list();
        const paginated = users.slice(offset, offset + limit);
        return { users: paginated, total: users.length };
    }
};
exports.InMemoryUsersService = InMemoryUsersService;
exports.InMemoryUsersService = InMemoryUsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [in_memory_user_store_1.InMemoryUserStore])
], InMemoryUsersService);
//# sourceMappingURL=in-memory-users.service.js.map