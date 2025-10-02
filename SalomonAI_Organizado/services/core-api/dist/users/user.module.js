"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var UserModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const user_service_1 = require("./user.service");
const users_service_1 = require("./users.service");
const user_controller_1 = require("./user.controller");
const users_controller_1 = require("./users.controller");
const user_entity_1 = require("./entities/user.entity");
const firebase_module_1 = require("../firebase/firebase.module");
const in_memory_user_service_1 = require("./in-memory-user.service");
const in_memory_users_service_1 = require("./in-memory-users.service");
const in_memory_user_store_1 = require("./in-memory-user.store");
const user_accounts_interface_1 = require("./interfaces/user-accounts.interface");
const user_directory_interface_1 = require("./interfaces/user-directory.interface");
let UserModule = UserModule_1 = class UserModule {
    static register(options = { mode: 'strict' }) {
        const isStrict = options.mode === 'strict';
        const sharedImports = [axios_1.HttpModule, config_1.ConfigModule, firebase_module_1.FirebaseModule];
        const imports = isStrict ? [typeorm_1.TypeOrmModule.forFeature([user_entity_1.User]), ...sharedImports] : sharedImports;
        const providers = [];
        if (isStrict) {
            providers.push(user_service_1.UserService, users_service_1.UsersService, { provide: user_accounts_interface_1.USER_ACCOUNTS_SERVICE, useExisting: user_service_1.UserService }, { provide: user_directory_interface_1.USER_DIRECTORY_SERVICE, useExisting: users_service_1.UsersService });
        }
        else {
            providers.push(in_memory_user_store_1.InMemoryUserStore, { provide: user_accounts_interface_1.USER_ACCOUNTS_SERVICE, useClass: in_memory_user_service_1.InMemoryUserService }, { provide: user_directory_interface_1.USER_DIRECTORY_SERVICE, useClass: in_memory_users_service_1.InMemoryUsersService }, { provide: user_service_1.UserService, useExisting: user_accounts_interface_1.USER_ACCOUNTS_SERVICE }, { provide: users_service_1.UsersService, useExisting: user_directory_interface_1.USER_DIRECTORY_SERVICE });
        }
        return {
            module: UserModule_1,
            imports,
            controllers: [user_controller_1.UserController, users_controller_1.UsersController],
            providers,
            exports: [user_service_1.UserService, users_service_1.UsersService, user_accounts_interface_1.USER_ACCOUNTS_SERVICE, user_directory_interface_1.USER_DIRECTORY_SERVICE],
        };
    }
};
exports.UserModule = UserModule;
exports.UserModule = UserModule = UserModule_1 = __decorate([
    (0, common_1.Module)({})
], UserModule);
//# sourceMappingURL=user.module.js.map