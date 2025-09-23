import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bank_connections')
export class BankConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'belvo_link_id', unique: true })
  belvoLinkId: string;

  @Column({ name: 'institution_name' })
  institutionName: string;

  @Column({ name: 'institution_id' })
  institutionId: string;

  @Column({ name: 'institution_type' })
  institutionType: string;

  @Column({ name: 'access_mode', default: 'single' })
  accessMode: string;

  @Column({ 
    type: 'enum',
    enum: ['active', 'invalid', 'unconfirmed', 'token_refresh'],
    default: 'active'
  })
  status: string;

  @Column({ name: 'last_accessed_at', type: 'timestamptz', nullable: true })
  lastAccessedAt: Date;

  @Column({ name: 'accounts_count', default: 0 })
  accountsCount: number;

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt: Date;

  @Column({ name: 'sync_frequency_hours', default: 24 })
  syncFrequencyHours: number;

  @Column({ name: 'auto_sync_enabled', default: true })
  autoSyncEnabled: boolean;

  @Column('jsonb', { nullable: true })
  metadata: {
    institutionLogo?: string;
    institutionWebsite?: string;
    institutionPrimaryColor?: string;
    belvoInstitutionData?: any;
    lastSyncResults?: {
      accountsSynced: number;
      transactionsSynced: number;
      errors?: string[];
    };
  };

  @Column('simple-array', { default: [] })
  connectedAccounts: string[]; // Array de IDs de cuentas Belvo

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'error_count', default: 0 })
  errorCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string;

  @Column({ name: 'user_id' })
  userId: string;

  // Relación manual con User (evita imports circulares por ahora)
  // @ManyToOne(() => User, (user) => user.bankConnections, { 
  //   nullable: false, 
  //   onDelete: 'CASCADE' 
  // })
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Métodos de utilidad
  get isHealthy(): boolean {
    return this.status === 'active' && this.errorCount < 5;
  }

  get needsSync(): boolean {
    if (!this.autoSyncEnabled || !this.isHealthy) return false;
    
    const lastSync = this.lastSyncAt || this.createdAt;
    const hoursSinceLastSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastSync >= this.syncFrequencyHours;
  }

  incrementErrorCount(error: string): void {
    this.errorCount += 1;
    this.lastError = error;
    
    // Desactivar auto-sync si hay muchos errores
    if (this.errorCount >= 5) {
      this.autoSyncEnabled = false;
    }
  }

  resetErrorCount(): void {
    this.errorCount = 0;
    this.lastError = null;
    this.autoSyncEnabled = true;
  }

  updateSyncResults(accountsSynced: number, transactionsSynced: number, errors?: string[]): void {
    this.lastSyncAt = new Date();
    this.metadata = {
      ...this.metadata,
      lastSyncResults: {
        accountsSynced,
        transactionsSynced,
        errors,
      },
    };

    if (errors && errors.length > 0) {
      this.incrementErrorCount(errors.join('; '));
    } else {
      this.resetErrorCount();
    }
  }
}
