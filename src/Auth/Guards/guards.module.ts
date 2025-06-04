import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminGuard } from './admin.guards';
import { BannedUserGuard } from './banned-user.guard';
import { UserBanEntity } from '../../DB/Entities/user-ban.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserBanEntity])],
  providers: [AdminGuard, BannedUserGuard],
  exports: [AdminGuard, BannedUserGuard],
})
export class GuardsModule {}
