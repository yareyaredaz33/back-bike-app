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

export enum ReportTargetType {
  ARTICLE = 'article',
  COMMENT = 'comment'
}

export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

@Entity('reports')
export class ReportEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ReportTargetType,
  })
  targetType: ReportTargetType;

  @Column({ type: 'varchar' })
  targetId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar' })
  reportedBy: string;

  @Column({ type: 'varchar' })
  targetUser: string;

  @Column({ type: 'json', nullable: true })
  targetContent: {
    title?: string;
    text?: string;
    content?: string;
  };

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: 'varchar', nullable: true })
  resolvedBy: string;

  @Column({ type: 'varchar', nullable: true })
  adminAction: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'reportedBy' })
  reportedByUser: UserEntity;

  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'targetUser' })
  targetUserEntity: UserEntity;

  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'resolvedBy' })
  resolvedByUser: UserEntity;
}
