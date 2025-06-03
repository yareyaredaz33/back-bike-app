import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  stripePaymentId: string;

  @Column()
  amount: number;

  @Column()
  currency: string;

  @Column()
  status: string;
  @Column({ type: 'varchar' , nullable:true})
  user_id: string;
  @Column({ type: 'varchar' , nullable:true})
  ride_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.payments)
  user: UserEntity;
}
