// In Admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserModule } from '../User/user.module';

@Module({
  imports: [UserModule], // Import UserModule to access UserService
  controllers: [AdminController],
  providers: [],
})
export class AdminModule {}
