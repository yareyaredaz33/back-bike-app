export interface AchievementDto {
  id: string;
  title: string;
  description: string;
  type: string;
  threshold: number;
  icon: string;
}

export interface UserAchievementDto {
  id: string;
  title: string;
  description: string;
  type: string;
  threshold: number;
  icon: string;
  unlocked_at: Date;
  is_seen: boolean;
}

export interface UserStatsDto {
  rideCount: number;
  totalDistance: number;
  totalDuration: number;
}

export interface AchievementProgressDto {
  achievement: AchievementDto;
  progress: number; // процент виконання (0-100)
  current: number; // поточне значення
}
