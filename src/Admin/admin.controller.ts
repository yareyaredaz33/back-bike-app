// In Admin/admin.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../User/user.service';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';
import { AdminGuard } from './Guards/admin.guard'; // You'll need to create this

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard) // Ensure only admins can access
export class AdminController {
  constructor(private readonly userService: UserService) {}

  @Get('pending-trainers')
  async getPendingTrainers() {
    const pendingUsers = await this.userService.getPendingTrainerApprovals();

    // Transform to exclude sensitive data
    return pendingUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      qualificationDocumentUrl: user.qualificationDocumentUrl,
      requestDate: user.trainerRequestDate
    }));
  }

  @Post('approve-trainer/:id')
  async approveTrainer(
    @Param('id') userId: number,
    @Body() data: { notes?: string }
  ) {
    try {
      const user = await this.userService.approveTrainer(userId, data.notes);
      return {
        success: true,
        message: `User ${user.username} has been approved as a trainer`,
      };
    } catch (error) {
      if (error.message === 'User not found') {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException('Failed to approve trainer');
    }
  }

  @Post('reject-trainer/:id')
  async rejectTrainer(
    @Param('id') userId: number,
    @Body() data: { notes?: string }
  ) {
    try {
      const user = await this.userService.rejectTrainer(userId, data.notes);
      return {
        success: true,
        message: `User ${user.username}'s trainer request has been rejected`,
      };
    } catch (error) {
      if (error.message === 'User not found') {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException('Failed to reject trainer');
    }
  }
}
