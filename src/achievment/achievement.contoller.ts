import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';
import { AchievementService } from './achievment.service';
import { AchievementProgressService } from './achievment-progress.service';

@Controller('achievements')
export class AchievementController {
  constructor(
    private readonly achievementService: AchievementService,
    private readonly achievementProgressService: AchievementProgressService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserAchievements(@Req() request) {
    const userId = request.user.userInfo.id;
    return this.achievementService.getUserAchievements(userId);
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  async getAchievementsProgress(@Req() request) {
    const userId = request.user.userInfo.id;
    return this.achievementProgressService.getUserAchievementsProgress(userId);
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  async checkAchievements(@Req() request) {
    const userId = request.user.userInfo.id;
    return this.achievementService.checkUserAchievements(userId);
  }

  @Post('seen')
  @UseGuards(JwtAuthGuard)
  async markAchievementsAsSeen(@Req() request) {
    const userId = request.user.userInfo.id;
    return this.achievementService.markAchievementsAsSeen(userId);
  }
}
