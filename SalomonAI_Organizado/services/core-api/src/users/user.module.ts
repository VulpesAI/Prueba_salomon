import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UserService } from './user.service';
import { UsersService } from './users.service';
import { UserController } from './user.controller';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { KafkaModule } from '../kafka/kafka.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // Provee el repositorio de User
    KafkaModule, // Provee el KafkaService
    HttpModule, // Provee el HttpService
    ConfigModule, // Provee el ConfigService
    FirebaseModule, // Provee Firebase Admin SDK
  ],
  controllers: [UserController, UsersController],
  providers: [UserService, UsersService],
  exports: [UserService, UsersService], // Exportamos ambos servicios para que otros módulos (como Auth) puedan usarlos
})
export class UserModule {}
