import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AchievementService } from './achievment.service';
import { UserEntityRide } from '../DB/Entities/user.entity.ride';
import { NotificationsEntity } from '../DB/Entities/notifications.entity';

@Injectable()
export class AchievementCronService implements OnModuleInit {
  private readonly logger = new Logger(AchievementCronService.name);

  constructor(
    private readonly achievementService: AchievementService,
    @InjectRepository(UserEntityRide)
    private userRepository: Repository<UserEntityRide>,
    @InjectRepository(NotificationsEntity)
    private notificationRepository: Repository<NotificationsEntity>,
  ) {}

  async onModuleInit() {
    // Initialize default achievements on app start
    await this.achievementService.initializeAchievements();
    this.logger.log('Default achievements initialized');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkAchievements() {
    this.logger.log('Running achievement check for all users');

    // Get unique users
    const userRides = await this.userRepository.find();
    const uniqueUserIds = [...new Set(userRides.map(ur => ur.user_id))];

    // Check achievements for each user
    for (const userId of uniqueUserIds) {
      const newAchievements = await this.achievementService.checkUserAchievements(userId);

      // Create notifications for new achievements
      for (const achievement of newAchievements) {
        await this.notificationRepository.save({
          title: 'Нове досягнення!',
          description: `Вітаємо! Ви розблокували "${achievement.title}": ${achievement.description}`,
          user_id: userId,
        });
      }

      if (newAchievements.length > 0) {
        this.logger.log(`User ${userId} unlocked ${newAchievements.length} new achievements`);
      }
    }
  }

  // Run check after each new ride is created
  async checkUserAchievementsAfterRide(userId: string) {
    const newAchievements = await this.achievementService.checkUserAchievements(userId);

    // Create notifications for new achievements
    for (const achievement of newAchievements) {
      await this.notificationRepository.save({
        title: 'Нове досягнення!',
        description: `Вітаємо! Ви розблокували "${achievement.title}": ${achievement.description}`,
        user_id: userId,
      });
    }

    return newAchievements;
  }
}
