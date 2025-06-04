import { Module } from '@nestjs/common';
import { RideService } from './ride.service';
import { RideController } from './ride.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideEntity } from '../DB/Entities/ride.entity';
import { UserEntityRide } from '../DB/Entities/user.entity.ride';
import { NotificationsEntity } from '../DB/Entities/notifications.entity';
import { Payment } from '../DB/Entities/Payment';
import { AchievementCronService } from '../achievment/achievement-cron.service';
import { AchievementService } from '../achievment/achievment.service';
import { AchievementEntity, UserAchievementEntity } from '../DB/Entities/achivement.entity';
import { LevelModule } from '../level/level';
import { LevelService } from '../level/level.service';
import { MonthlyGoalEntity, MonthlyStatsEntity, UserLevelEntity } from '../DB/Entities/level.entity';
import { RideApplicationEntity } from '../DB/Entities/ride-application.entity';
import { UserEntity } from '../DB/Entities/user.entity';

@Module({
  controllers: [RideController],
  providers: [RideService, AchievementCronService, AchievementService, LevelService],
  imports: [
    TypeOrmModule.forFeature([
      RideEntity,
      UserEntityRide,
      NotificationsEntity,
      Payment,
      AchievementEntity,
      UserAchievementEntity,
      LevelModule,
      UserLevelEntity,
      MonthlyGoalEntity,
      MonthlyStatsEntity,
      RideApplicationEntity,
      UserEntity
    ]),
  ],
})
export class RideModule {}
