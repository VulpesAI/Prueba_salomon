import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UserService } from './user.service';
import { UsersService } from './users.service';
import { UserController } from './user.controller';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { FirebaseModule } from '../firebase/firebase.module';
import { EnvStrictnessMode } from '../config/env.validation';
import { InMemoryUserService } from './in-memory-user.service';
import { InMemoryUsersService } from './in-memory-users.service';
import { InMemoryUserStore } from './in-memory-user.store';
import { USER_ACCOUNTS_SERVICE } from './interfaces/user-accounts.interface';
import { USER_DIRECTORY_SERVICE } from './interfaces/user-directory.interface';

@Module({})
export class UserModule {
  static register(options: { mode: EnvStrictnessMode } = { mode: 'strict' }): DynamicModule {
    const isStrict = options.mode === 'strict';

    const sharedImports = [HttpModule, ConfigModule, FirebaseModule];
    const imports = isStrict ? [TypeOrmModule.forFeature([User]), ...sharedImports] : sharedImports;

    const providers: Provider[] = [];

    if (isStrict) {
      providers.push(
        UserService,
        UsersService,
        { provide: USER_ACCOUNTS_SERVICE, useExisting: UserService },
        { provide: USER_DIRECTORY_SERVICE, useExisting: UsersService },
      );
    } else {
      providers.push(
        InMemoryUserStore,
        { provide: USER_ACCOUNTS_SERVICE, useClass: InMemoryUserService },
        { provide: USER_DIRECTORY_SERVICE, useClass: InMemoryUsersService },
        { provide: UserService, useExisting: USER_ACCOUNTS_SERVICE },
        { provide: UsersService, useExisting: USER_DIRECTORY_SERVICE },
      );
    }

    return {
      module: UserModule,
      imports,
      controllers: [UserController, UsersController],
      providers,
      exports: [UserService, UsersService, USER_ACCOUNTS_SERVICE, USER_DIRECTORY_SERVICE],
    };
  }
}
