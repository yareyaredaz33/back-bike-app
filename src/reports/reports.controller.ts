import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';
import { AdminGuard } from '../Auth/Guards/admin.guards';
import { CreateReportDto } from './create-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createReportDto: CreateReportDto, @Req() req) {
    return this.reportsService.create(createReportDto, req.user.userInfo.id);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyReports(@Req() req) {
    return this.reportsService.findMyReports(req.user.userInfo.id);
  }
}

@Controller('admin')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findAllReports(@Query('status') status?: string) {
    return this.reportsService.findAllReports(status);
  }

  @Post('reports/:id/dismiss')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async dismissReport(@Param('id') id: string, @Req() req) {
    return this.reportsService.dismissReport(+id, req.user.userInfo.id);
  }

  @Post('reports/:id/resolve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async resolveReport(
    @Param('id') id: string,
    @Body() body: { action: string },
    @Req() req
  ) {
    return this.reportsService.resolveReport(+id, body.action, req.user.userInfo.id);
  }

  @Post('ban-user')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async banUser(
    @Body() banData: { userId: string; reason: string; duration: number },
    @Req() req
  ) {
    return this.reportsService.banUser(
      banData.userId,
      banData.reason,
      banData.duration,
      req.user.userInfo.id
    );
  }

  @Get('banned-users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getBannedUsers() {
    return this.reportsService.getBannedUsers();
  }

  @Post('unban-user/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async unbanUser(@Param('userId') userId: string, @Req() req) {
    return this.reportsService.unbanUser(userId, req.user.userInfo.id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getReportStats() {
    return this.reportsService.getReportStats();
  }
}
