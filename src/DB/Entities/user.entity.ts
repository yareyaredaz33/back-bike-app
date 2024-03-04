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
  city: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string;

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

  @OneToMany(() => ArticleEntity, (article) => article.user)
  articles: ArticleEntity[];

  @OneToMany(() => CommentEntity, (comment) => comment.user)
  comments: CommentEntity[];
}
