import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FinancialMovement } from '../../financial-movements/entities/financial-movement.entity';
import { UserClassificationRule } from '../../classification-rules/entities/user-classification-rule.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { FinancialGoal } from '../../goals/entities/financial-goal.entity';
import { AuthToken } from '../../auth/entities/auth-token.entity';

@Entity('users') // Mapea esta clase a la tabla 'users' en la BD
export class User {
  @PrimaryGeneratedColumn('uuid') // Clave primaria autogenerada como UUID
  id: string;

  @Column({ unique: true, nullable: true }) // Firebase UID
  uid: string;

  @Column({ unique: true, nullable: false }) // Columna 'email', debe ser única y no nula
  email: string;

  @Column({ name: 'password_hash', nullable: true, select: false }) // La contraseña nunca se devuelve en las consultas
  passwordHash: string;

  @Column({ name: 'full_name', nullable: true }) // Columna 'full_name', puede ser nula
  fullName: string;

  @Column({ name: 'display_name', nullable: true })
  displayName: string;

  @Column({ name: 'photo_url', nullable: true })
  photoURL: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column('json', { nullable: true })
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };

  @Column('simple-array', { default: ['user'] })
  roles: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret', nullable: true, select: false })
  mfaSecret?: string | null;

  @Column({ name: 'mfa_temp_secret', nullable: true, select: false })
  mfaTempSecret?: string | null;

  @Column('json', { name: 'mfa_backup_codes', nullable: true, select: false })
  mfaBackupCodes?: string[] | null;

  @Column({ name: 'last_mfa_at', type: 'timestamptz', nullable: true })
  lastMfaAt?: Date | null;

  @Column('json', { name: 'oauth_providers', nullable: true })
  oauthProviders?: {
    provider: string;
    subject: string;
    picture?: string;
    lastLoginAt?: string;
  }[];

  @Column('json', { nullable: true })
  preferences: {
    currency?: string;
    timezone?: string;
    language?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      pushTokens?: string[];
      mutedEvents?: { key: string; until?: string }[];
    };
    privacy?: {
      shareData?: boolean;
      analytics?: boolean;
    };
  };

  @Column('json', { nullable: true })
  profile: {
    dateOfBirth?: string;
    occupation?: string;
    income?: number;
    financialGoals?: string[];
    riskTolerance?: 'low' | 'medium' | 'high';
    investmentExperience?: 'none' | 'basic' | 'intermediate' | 'advanced';
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) // Fecha de creación automática
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) // Fecha de actualización automática
  updatedAt: Date;

  @OneToMany(() => FinancialMovement, (movement: FinancialMovement) => movement.user)
  movements: FinancialMovement[];

  @OneToMany(() => UserClassificationRule, (rule: UserClassificationRule) => rule.user)
  classificationRules: UserClassificationRule[];

  @OneToMany(() => Notification, (notification: Notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => Transaction, (transaction: Transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => FinancialGoal, goal => goal.user)
  goals: FinancialGoal[];

  @OneToMany(() => AuthToken, token => token.user)
  authTokens: AuthToken[];

  // Relaciones con otras entidades se agregarán gradualmente
  // @OneToMany(() => FinancialAccount, (account) => account.user)
  // accounts: FinancialAccount[];

  // @OneToMany(() => BankConnection, (connection) => connection.user)
  // bankConnections: BankConnection[];
}