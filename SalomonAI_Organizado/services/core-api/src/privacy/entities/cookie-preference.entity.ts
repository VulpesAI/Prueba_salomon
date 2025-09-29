import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'privacy_cookie_preferences' })
export class CookiePreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_privacy_cookie_user', { unique: true })
  @Column({ name: 'user_id', type: 'varchar', length: 120 })
  userId!: string;

  @Column({ name: 'preferences', type: 'jsonb', default: () => "'{}'::jsonb" })
  preferences!: Record<string, boolean>;

  @Column({ name: 'source', type: 'varchar', length: 120, nullable: true })
  source?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
