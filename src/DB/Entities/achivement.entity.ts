import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('achievements')
export class AchievementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  type: string; // DISTANCE, RIDE_COUNT, FIRST_RIDE, etc.

  @Column()
  threshold: number; // Value required to achieve (e.g., 100 km)

  @Column({ nullable: true })
  icon: string; // URL or name of the icon
}

@Entity('user_achievements')
export class UserAchievementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  achievement_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  unlocked_at: Date;

  @Column({ default: false })
  is_seen: boolean; // To show notification for new achievements
}
