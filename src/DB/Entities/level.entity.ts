import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_levels')
export class UserLevelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 100 })
  xp_to_next_level: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated: Date;
}

@Entity('monthly_goals')
export class MonthlyGoalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  year: number;

  @Column()
  month: number;

  @Column({ default: 0 })
  distance_goal: number; // в метрах

  @Column({ default: 0 })
  rides_goal: number;

  @Column({ default: 0 })
  duration_goal: number; // в хвилинах

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}

// Для зберігання статистики за місяць
@Entity('monthly_stats')
export class MonthlyStatsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  year: number;

  @Column()
  month: number;

  @Column({ default: 0 })
  distance: number; // в метрах

  @Column({ default: 0 })
  rides_count: number;

  @Column({ default: 0 })
  duration: number; // в хвилинах

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
