import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private readonly userRelations = [
    'bankAccounts',
    'financialMovements',
    'classificationRules',
    'notifications',
    'transactions',
  ] as const;

  /**
   * Buscar usuario por Firebase UID
   */
  async findByUid(uid: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { uid },
      relations: [...this.userRelations],
    });
  }

  /**
   * Buscar usuario por email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: [...this.userRelations],
    });
  }

  /**
   * Buscar usuario por ID interno
   */
  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: [...this.userRelations],
    });
  }

  /**
   * Crear un nuevo usuario desde Firebase
   */
  async createFromFirebase(
    firebaseUser: {
      uid: string;
      email?: string | null;
      displayName?: string;
      photoURL?: string;
      emailVerified?: boolean;
      phoneNumber?: string;
      metadata?: {
        creationTime?: string;
        lastSignInTime?: string;
      };
    },
    repository: Repository<User> = this.usersRepository,
  ): Promise<User> {
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

  /**
   * Actualizar información del usuario
   */
  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }

  /**
   * Actualizar última conexión del usuario
   */
  async updateLastSignIn(uid: string, lastSignInTime: string): Promise<void> {
    await this.usersRepository.update(
      { uid },
      {
        metadata: {
          lastSignInTime,
        } as any,
      },
    );
  }

  /**
   * Sincronizar usuario con datos de Firebase
   */
  async syncWithFirebase(firebaseUser: {
    uid: string;
    email?: string | null;
    displayName?: string;
    photoURL?: string;
    emailVerified?: boolean;
    phoneNumber?: string;
    metadata?: {
      creationTime?: string;
      lastSignInTime?: string;
    };
  }): Promise<User> {
    if (!firebaseUser?.uid) {
      throw new Error('Firebase user UID is required to sync the account.');
    }

    const email = firebaseUser.email?.trim();

    return this.usersRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(User);

      const loadUser = async (where: FindOptionsWhere<User>) =>
        repository.findOne({
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

  /**
   * Desactivar usuario
   */
  async deactivate(id: string): Promise<void> {
    await this.usersRepository.update(id, { isActive: false });
  }

  /**
   * Activar usuario
   */
  async activate(id: string): Promise<void> {
    await this.usersRepository.update(id, { isActive: true });
  }

  /**
   * Obtener todos los usuarios (para admin)
   */
  async findAll(limit: number = 100, offset: number = 0): Promise<{
    users: User[];
    total: number;
  }> {
    const [users, total] = await this.usersRepository.findAndCount({
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { users, total };
  }
}
