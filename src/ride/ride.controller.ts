import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
  Req,
  Query,
} from '@nestjs/common';
import { RideService } from './ride.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';
import { Response } from 'express'
import { CreateRideApplicationDto } from './dto/create-ride-application.dto';
import { UpdateRideApplicationDto } from './dto/update-ride-application.dto';

@Controller('ride')
export class RideController {
  constructor(private readonly rideService: RideService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createRideDto: CreateRideDto, @Req() request) {
    return this.rideService.create(createRideDto, request.user.userInfo.id);
  }

  @Get('user_owner')
  @UseGuards(JwtAuthGuard)
  findAllForOwner(@Req() request) {
    return this.rideService.findAllForUser(request.user.userInfo.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('q') search: string,
    @Query('type') type: string,
    @Req() request,
  ) {
    if (search === 'recommended') {
      const userId = request.user?.userInfo?.id;
      if (!userId) {
        return this.rideService.findAll();
      }
      return this.rideService.getRecommendedRides(userId);
    }

    return this.rideService.findAll(null, search);
  }

  @Get('user_rides/:id')
  findAllForUser(@Param('id') userId: string) {
    return this.rideService.findAll(userId);
  }

  @Get('user_rides_current')
  @UseGuards(JwtAuthGuard)
  findAllForCurrentUser(@Param('id') userId: string, @Req() request) {
    return this.rideService.findAll(request.user.userInfo.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() request) {
    const result = await this.rideService.findOne(id, request.user.userInfo.id);

    // Перевіряємо статус заявки користувача
    const applicationStatus = await this.rideService.getApplicationStatus(
      request.user.userInfo.id,
      id,
    );

    return {
      ...result,
      canBeDeleted: result.user_id === request.user.userInfo.id,
      applicationStatus, // pending | approved | rejected | null
    };
  }

  // Модифікований метод приєднання до поїздки
  @UseGuards(JwtAuthGuard)
  @Post(':id/apply')
  async subscribeToUser(
    @Param() params: { id: string },
    @Body() applicationDto: CreateRideApplicationDto,
    @Res() res: Response,
    @Req() request,
  ) {
    try {
      const result = await this.rideService.applyToRide(
        request.user.userInfo,
        params.id,
        applicationDto,
      );

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // Нові ендпоінти для роботи з заявками

  // Отримання заявок для тренера
  @Get('applications/trainer')
  @UseGuards(JwtAuthGuard)
  async getTrainerApplications(
    @Req() request,
    @Query('rideId') rideId?: string,
  ) {
    return this.rideService.getApplicationsForTrainer(
      request.user.userInfo.id,
      rideId,
    );
  }

  // Отримання заявок користувача
  @Get('applications/user')
  @UseGuards(JwtAuthGuard)
  async getUserApplications(@Req() request) {
    return this.rideService.getUserApplications(request.user.userInfo.id);
  }

  // Схвалення або відхилення заявки тренером
  @Patch('applications/:applicationId')
  @UseGuards(JwtAuthGuard)
  async handleApplication(
    @Param('applicationId') applicationId: string,
    @Body() updateDto: UpdateRideApplicationDto,
    @Req() request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.rideService.handleRideApplication(
        request.user.userInfo.id,
        applicationId,
        updateDto,
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // Отримання заявок для конкретної поїздки (для тренера)
  @Get(':id/applications')
  @UseGuards(JwtAuthGuard)
  async getRideApplications(@Param('id') rideId: string, @Req() request) {
    return this.rideService.getApplicationsForTrainer(
      request.user.userInfo.id,
      rideId,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRideDto: UpdateRideDto) {
    return this.rideService.update(+id, updateRideDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rideService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/unapply')
  async unSubscribeToUser(
    @Param() params: { id: string },
    @Res() res: Response,
    @Req() request,
  ) {
    const result = await this.rideService.unApplyToRide(
      request.user.userInfo,
      params.id,
    );
    result.affected > 0 ? res.sendStatus(204) : res.sendStatus(400);
    return;
  }
}
