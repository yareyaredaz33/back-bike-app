import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_bans')
export class UserBanEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'int' })
  duration: number; // в днях

  @Column({ type: 'varchar' })
  bannedBy: string;

  @Column({ type: 'varchar', nullable: true })
  unbannedBy: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  bannedAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  unbannedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'bannedBy' })
  bannedByUser: UserEntity;

  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'unbannedBy' })
  unbannedByUser: UserEntity;
}
