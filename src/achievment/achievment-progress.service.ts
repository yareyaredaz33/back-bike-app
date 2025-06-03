import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AchievementEntity } from '../DB/Entities/achivement.entity';
import { AchievementService } from './achievment.service';

@Injectable()
export class AchievementProgressService {
  constructor(
    @InjectRepository(AchievementEntity)
    private achievementRepository: Repository<AchievementEntity>,
    private achievementService: AchievementService,
  ) {}

  async getUserAchievementsProgress(userId: string) {
    // Отримуємо всі ачівки
    const achievements = await this.achievementRepository.find();

    // Отримуємо отримані ачівки
    const userAchievements = await this.achievementService.getUserAchievements(userId);
    const userAchievementIds = userAchievements.map(a => a.id);

    // Отримуємо поточну статистику користувача
    const userStats = await this.achievementService.calculateUserStats(userId);

    // Розраховуємо прогрес для кожного досягнення
    const achievementsWithProgress = achievements.map(achievement => {
      // Якщо досягнення вже отримано, прогрес 100%
      if (userAchievementIds.includes(achievement.id)) {
        return {
          achievement,
          progress: 100,
          current: achievement.threshold,
          isCompleted: true
        };
      }

      // Інакше розраховуємо прогрес залежно від типу досягнення
      let current = 0;
      switch (achievement.type) {
        case 'RIDE_COUNT':
          current = userStats.rideCount;
          break;
        case 'DISTANCE':
          current = userStats.totalDistance;
          break;
        case 'DURATION':
          current = userStats.totalDuration;
          break;
        default:
          current = 0;
      }

      // Розраховуємо процент виконання (обмежуємо до 99% якщо не досягнуто)
      const progressPercent = Math.min(
        Math.floor((current / achievement.threshold) * 100),
        99
      );

      return {
        achievement,
        progress: progressPercent,
        current,
        isCompleted: false
      };
    });

    return achievementsWithProgress;
  }
}
