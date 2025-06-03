import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RideEntity } from './ride.entity';
import { UserEntity } from './user.entity';

@Entity()
export class UserEntityRide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  ride_id: string;

  @Column({ type: 'varchar' })
  user_id: string;
}
