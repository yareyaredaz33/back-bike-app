import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController, AdminReportsController } from './reports.controller';
import { ReportEntity } from '../DB/Entities/report.entity';
import { UserBanEntity } from '../DB/Entities/user-ban.entity';
import { ArticleEntity } from '../DB/Entities/article.entity';
import { CommentEntity } from '../DB/Entities/comment.entity';
import { UserEntity } from '../DB/Entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportEntity,
      UserBanEntity,
      ArticleEntity,
      CommentEntity,
      UserEntity,
    ]),
  ],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService],
  exports: [ReportsService, TypeOrmModule],
})
export class ReportsModule {}
