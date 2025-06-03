import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementController } from './achievement.contoller';
import { AchievementService } from './achievment.service';
import { AchievementEntity, UserAchievementEntity } from '../DB/Entities/achivement.entity';
import { RideEntity } from '../DB/Entities/ride.entity';
import { UserEntityRide } from '../DB/Entities/user.entity.ride';
import { ScheduleModule } from '@nestjs/schedule';
import { AchievementCronService } from './achievement-cron.service';
import { NotificationsEntity } from '../DB/Entities/notifications.entity';
import { AchievementProgressService } from './achievment-progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AchievementEntity,
      UserAchievementEntity,
      RideEntity,
      UserEntityRide,
      NotificationsEntity,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AchievementController],
  providers: [AchievementService, AchievementCronService,AchievementProgressService],
  exports: [AchievementService],
})
export class AchievementModule {}
