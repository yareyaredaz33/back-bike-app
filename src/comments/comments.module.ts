import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import {
  CommentsController,
  AdminCommentsController,
} from './comments.controller';
import { CommentEntity } from '../DB/Entities/comment.entity';
import { UserBanEntity } from '../DB/Entities/user-ban.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity, UserBanEntity])],
  controllers: [CommentsController, AdminCommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
