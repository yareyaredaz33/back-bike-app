import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn, OneToMany,
} from 'typeorm';
import { RoadEntity } from './road.entity';
import { UserEntityRide } from './user.entity.ride';
@Entity()
export class RideEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', nullable: true })
  user_count: number;

  @Column({ type: 'boolean', nullable: true })
  isPaid: string;
  @Column({ type: 'int', nullable: true })
  price: number;

  @Column({ type: 'varchar' })
  road_id: string;

  @Column({ type: 'varchar' })
  title: string;
  @Column({ type: 'varchar', nullable: true })
  user_id: string;
  @Column({ type: 'varchar' })
  description: string;
  @CreateDateColumn({ type: 'varchar', nullable: true })
  createdat: string;
  @Column({ type: 'varchar', nullable: true })
  date: string;
  @Column({ type: 'int', nullable: true })
  duration: number;
  @Column({ type: 'int', nullable: true })
  distance: number;
  @OneToMany(() => UserEntityRide, (userRide) => userRide.ride)
  participants: UserEntityRide[];
  @ManyToOne(() => RoadEntity, (road) => road.rides, {
    onDelete: 'CASCADE',
  })
  road: RoadEntity;
}
