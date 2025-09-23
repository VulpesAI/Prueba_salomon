import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
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

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email }, select: ['id', 'email', 'passwordHash'] });
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