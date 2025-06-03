import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RideEntity } from './ride.entity';
import { UserEntity } from './user.entity';

@Entity()
export class UserEntityRide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' , nullable:true})
  ride_id: string;

  @Column({ type: 'varchar', nullable:true })
  user_id: string;

  // Додаємо relations
  @ManyToOne(() => RideEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ride_id'})
  ride: RideEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
