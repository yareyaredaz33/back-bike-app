import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../DB/Entities/user.entity';
import { NotificationsEntity } from '../DB/Entities/notifications.entity';
import { SubscriptionsEntity } from '../DB/Entities/subscriptionsEntity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileService } from '../User/file.service';
import { ArticleEntity } from '../DB/Entities/article.entity';
import { UserBanEntity } from '../DB/Entities/user-ban.entity';

@Module({
  controllers: [ArticlesController],
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      NotificationsEntity,
      SubscriptionsEntity,
      ArticleEntity,
      UserBanEntity
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  ],
  providers: [ArticlesService, FileService],
})
export class ArticlesModule {}
