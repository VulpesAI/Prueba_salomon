import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Buscar usuario por Firebase UID
   */
  async findByUid(uid: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { uid },
      relations: ['bankAccounts', 'financialMovements', 'classificationRules', 'notifications', 'transactions'],
    });
  }

  /**
   * Buscar usuario por email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['bankAccounts', 'financialMovements', 'classificationRules', 'notifications', 'transactions'],
    });
  }

  /**
   * Buscar usuario por ID interno
   */
  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['bankAccounts', 'financialMovements', 'classificationRules', 'notifications', 'transactions'],
    });
  }

  /**
   * Crear un nuevo usuario desde Firebase
   */
  async createFromFirebase(firebaseUser: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    emailVerified?: boolean;
    phoneNumber?: string;
    metadata?: {
      creationTime?: string;
      lastSignInTime?: string;
    };
  }): Promise<User> {
    const user = this.usersRepository.create({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified || false,
      phoneNumber: firebaseUser.phoneNumber,
      metadata: firebaseUser.metadata,
      fullName: firebaseUser.displayName,
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

    return this.usersRepository.save(user);
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
    email: string;
    displayName?: string;
    photoURL?: string;
    emailVerified?: boolean;
    phoneNumber?: string;
    metadata?: {
      creationTime?: string;
      lastSignInTime?: string;
    };
  }): Promise<User> {
    let user = await this.findByUid(firebaseUser.uid);

    if (!user && firebaseUser.email) {
      // Si no encontramos por UID, intentar reconciliar por email para cuentas existentes
      user = await this.findByEmail(firebaseUser.email);
    }

    if (!user) {
      // Si el usuario no existe, créalo
      return this.createFromFirebase(firebaseUser);
    }

    // Si existe, actualiza la información y asegura que el UID quede sincronizado
    user.uid = firebaseUser.uid;
    user.email = firebaseUser.email;
    user.displayName = firebaseUser.displayName;
    user.photoURL = firebaseUser.photoURL;
    user.emailVerified = firebaseUser.emailVerified || false;
    user.phoneNumber = firebaseUser.phoneNumber;
    user.metadata = firebaseUser.metadata;

    return this.usersRepository.save(user);
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
