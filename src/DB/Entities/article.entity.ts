import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity()
export class ArticleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'int' })
  views: number;

  @CreateDateColumn({ type: 'varchar', nullable: true })
  createdAt: string;
  @UpdateDateColumn({ type: 'varchar', nullable: true })
  updateAt: string;

  @Column({ type: 'varchar', nullable: true })
  img: string;

  @Column({ type: 'json' })
  blocks: Array<{
    type: string;
    title: string;
    paragraphs?: Array<string>;
  }>;

  @Column({ type: 'varchar' })
  user_id: string;

  @ManyToOne(() => UserEntity, (user) => user.articles)
  user: UserEntity;
}
