import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../DB/Entities/user.entity';
import { UserService } from '../User/user.service';
import { UserController } from './user.controller';
import { UserModel } from './Model/user.model';
import { MulterModule } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SubscriptionsEntity } from '../DB/Entities/subscriptionsEntity';
import { ChatEntity } from '../DB/Entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, SubscriptionsEntity, ChatEntity]),
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
  controllers: [UserController],
  providers: [UserService, UserModel, FileService],
  exports: [UserService, UserModel,FileService],
})
export class UserModule {}
