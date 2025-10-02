"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configModuleOptions = void 0;
const env_loader_1 = require("./env.loader");
const configuration_1 = require("./configuration");
const env_validation_1 = require("./env.validation");
(0, env_loader_1.loadRootEnv)();
exports.configModuleOptions = {
    load: [configuration_1.default],
    validate: env_validation_1.validateEnv,
    validationOptions: {
        allowUnknown: true,
        abortEarly: false,
    },
    isGlobal: true,
    cache: true,
    ignoreEnvFile: true,
};
//# sourceMappingURL=config.module-options.js.map