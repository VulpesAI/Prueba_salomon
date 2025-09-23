import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_classification_rules')
export class UserClassificationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  keyword: string;

  @Column()
  category: string;

  @ManyToOne(() => User, (user) => user.classificationRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}