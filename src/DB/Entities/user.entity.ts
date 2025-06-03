import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRoleEntity } from './user.role.entity';
import { SessionEntity } from './session.entity';
import { UserSettingsEntity } from './user.settings.entity';
import { RoadEntity } from './road.entity';
import { ArticleEntity } from './article.entity';
import { CommentEntity } from './comment.entity';
import { Payment } from './Payment';
import { UserEntityRide } from './user.entity.ride';

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'varchar' })
  password_salt: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  username: string;

  @Column({ type: 'varchar', nullable: true })
  first: string;

  @Column({ type: 'varchar', nullable: true })
  lastname: string;

  @Column({ type: 'int', nullable: true })
  age: number;
  @Column({ type: 'varchar', nullable: true })
  role: string;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string;
  @Column({ nullable: true })
  qualificationDocumentUrl: string;
  @CreateDateColumn({ type: 'varchar', nullable: true })
  createdat: string;


  @OneToMany(() => UserRoleEntity, (role) => role.user)
  roles: UserRoleEntity[];

  @OneToMany(() => RoadEntity, (role) => role.user)
  roads: RoadEntity[];

  @OneToMany(() => SessionEntity, (role) => role.user)
  sessions: SessionEntity[];

  @OneToMany(() => UserSettingsEntity, (role) => role.user)
  settings: UserSettingsEntity[];
  x
  @OneToMany(() => ArticleEntity, (article) => article.user)
  articles: ArticleEntity[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => CommentEntity, (comment) => comment.user)
  comments: CommentEntity[];
  @Column({ default: false })
  isPendingTrainerApproval: boolean;

  // Timestamp for when approval request was submitted
  @Column({ nullable: true, type: 'timestamp' })
  trainerRequestDate: Date;
  @Column({ default: false })
  isApproved: boolean;
  // You might want to add notes from the admin about approval/rejection
  @Column({ nullable: true })
  approvalNotes: string;
}
