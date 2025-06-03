import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { LevelService } from './level.service';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';

@Controller('levels')
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserLevel(@Req() request) {
    const userId = request.user.userInfo.id;
    return this.levelService.getUserLevel(userId);
  }

  @Get('monthly-goal')
  @UseGuards(JwtAuthGuard)
  async getMonthlyGoal(@Req() request) {
    const userId = request.user.userInfo.id;
    return this.levelService.getMonthlyGoal(userId);
  }

  @Post('monthly-goal')
  @UseGuards(JwtAuthGuard)
  async setMonthlyGoal(
    @Req() request,
    @Body() goalData: { distanceGoal: number; ridesGoal: number; durationGoal: number },
  ) {
    const userId = request.user.userInfo.id;
    return this.levelService.setMonthlyGoal(
      userId,
      goalData.distanceGoal,
      goalData.ridesGoal,
      goalData.durationGoal,
    );
  }

  @Get('monthly-goals/history')
  @UseGuards(JwtAuthGuard)
  async getMonthlyGoalsHistory(@Req() request) {
    const userId = request.user.userInfo.id;
    return this.levelService.getMonthlyGoalsHistory(userId);
  }

  @Get('monthly-goals/check')
  @UseGuards(JwtAuthGuard)
  async checkMonthlyGoal(@Req() request) {
    const userId = request.user.userInfo.id;
    const now = new Date();
    return this.levelService.checkMonthlyGoalForUser(
      userId,
      now.getFullYear(),
      now.getMonth() + 1,
    );
  }
}
