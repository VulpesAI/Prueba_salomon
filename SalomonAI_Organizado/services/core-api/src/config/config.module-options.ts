import { ConfigModuleOptions } from '@nestjs/config';
import { loadRootEnv } from './env.loader';
import configuration from './configuration';
import { validateEnv } from './env.validation';

loadRootEnv();

export const configModuleOptions: ConfigModuleOptions = {
  load: [configuration],
  validate: validateEnv,
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
  isGlobal: true,
  cache: true,
  ignoreEnvFile: true,
};
