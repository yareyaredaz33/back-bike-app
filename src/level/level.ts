import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LevelController } from './level.controller';
import { LevelService } from './level.service';
import { MonthlyGoalEntity, MonthlyStatsEntity, UserLevelEntity } from '../DB/Entities/level.entity';
import { NotificationsEntity } from '../DB/Entities/notifications.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { AchievementEntity, UserAchievementEntity } from '../DB/Entities/achivement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserLevelEntity,
      MonthlyGoalEntity,
      MonthlyStatsEntity,
      NotificationsEntity,
      AchievementEntity,
      UserAchievementEntity,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [LevelController],
  providers: [LevelService],
  exports: [LevelService],
})
export class LevelModule {}
