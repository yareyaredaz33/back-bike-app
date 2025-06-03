import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './DB/Entities/user.entity';
import { UserRoleEntity } from './DB/Entities/user.role.entity';
import { UserSettingsEntity } from './DB/Entities/user.settings.entity';
import { SessionEntity } from './DB/Entities/session.entity';
import { UserModule } from './User/user.module';
import { RoadModule } from './road/road.module';
import { RoadEntity } from './DB/Entities/road.entity';
import { ChatModule } from './chat/chat.module';
import { RideModule } from './ride/ride.module';
import { RideEntity } from './DB/Entities/ride.entity';
import { MessageEntity } from './DB/Entities/message.entity';
import { ChatEntity } from './DB/Entities/chat.entity';
import { SubscriptionsEntity } from './DB/Entities/subscriptionsEntity';
import { UserEntityRide } from './DB/Entities/user.entity.ride';
import { NotificationsEntity } from './DB/Entities/notifications.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { ArticlesModule } from './articles/articles.module';
import { ArticleEntity } from './DB/Entities/article.entity';
import { CommentsModule } from './comments/comments.module';
import { CommentEntity } from './DB/Entities/comment.entity';
import { Payment } from './DB/Entities/Payment';
import { PaymentsModule } from './Stripe/payments.module';
import { AchievementEntity, UserAchievementEntity } from './DB/Entities/achivement.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { AchievementModule } from './achievment/achievement.module';
import { LevelModule } from './level/level';
import { MonthlyGoalEntity, MonthlyStatsEntity, UserLevelEntity } from './DB/Entities/level.entity';
import { AdminModule } from './Admin/admin.module';
import { RideApplicationEntity } from './DB/Entities/ride-application.entity';
import { ReportEntity } from './DB/Entities/report.entity';
import { UserBanEntity } from './DB/Entities/user-ban.entity';
import { ReportsModule } from './reports/reports.module';
import { GuardsModule } from './Auth/Guards/guards.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    UserModule,
    RoadModule,
    ChatModule,
    NotificationsModule,
    PaymentsModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        port: 5432,
        host: configService.get('PGHOST'),
        username: configService.get('PGUSER'),
        password: configService.get('PGPASSWORD'),
        database: configService.get('PGDATABASE'),
        synchronize: true,
        ssl: true,
        entities: [
          UserEntity,
          UserRoleEntity,
          UserSettingsEntity,
          SessionEntity,
          RoadEntity,
          RideEntity,
          MessageEntity,
          SubscriptionsEntity,
          UserEntityRide,
          NotificationsEntity,
          ArticleEntity,
          CommentEntity,
          ChatEntity,
          Payment,
          AchievementEntity,
          UserAchievementEntity,
          UserLevelEntity,
          MonthlyGoalEntity,
          MonthlyStatsEntity,
RideApplicationEntity,
          ReportEntity,
          UserBanEntity,
        ],
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    RoadModule,
    ChatModule,
    RideModule,
    NotificationsModule,
    ArticlesModule,
    CommentsModule,
    AchievementModule,
    LevelModule,
    AdminModule,
    ReportsModule,
    GuardsModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
