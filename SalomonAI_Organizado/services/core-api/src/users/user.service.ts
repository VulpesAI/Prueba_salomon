import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { UserAccountsService } from './interfaces/user-accounts.interface';

@Injectable()
export class UserService implements UserAccountsService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
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

    } catch (error) {
      this.logger.error('Error during user creation process', error.stack);
      // Re-throw a standard NestJS exception
      throw new InternalServerErrorException('Failed to create user due to an internal error.');
    }
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.passwordHash', 'user.mfaSecret', 'user.mfaTempSecret', 'user.mfaBackupCodes'])
      .where('user.email = :email', { email })
      .getOne();
  }

  async getByIdWithSecrets(id: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.mfaSecret', 'user.mfaTempSecret', 'user.mfaBackupCodes'])
      .where('user.id = :id', { id })
      .getOne();
  }

  async setMfaTempSecret(userId: string, secret: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { mfaTempSecret: secret });
  }

  async activateMfa(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      {
        mfaSecret: secret,
        mfaEnabled: true,
        mfaTempSecret: null,
        mfaBackupCodes: backupCodes,
        lastMfaAt: new Date(),
      },
    );
  }

  async updateMfaUsage(userId: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { lastMfaAt: new Date() });
  }

  async disableMfa(userId: string): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      {
        mfaEnabled: false,
        mfaSecret: null,
        mfaTempSecret: null,
        mfaBackupCodes: null,
        lastMfaAt: null,
      },
    );
  }

  async consumeBackupCode(userId: string, code: string): Promise<boolean> {
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

  async upsertOAuthUser(params: {
    email: string;
    fullName?: string;
    displayName?: string;
    picture?: string;
    provider: string;
    subject: string;
  }): Promise<User> {
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
    } else {
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
      } else {
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

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.preload({ id, ...updateUserDto });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
  }
}