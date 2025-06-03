import { UserService } from './user.service';
import { UserProfileView } from './DTO/user.profile.view';
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  Delete,
  Query, NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';
import { FileService } from './file.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly fileService: FileService,
  ) {}
  @Get('approval-status')
  @UseGuards(JwtAuthGuard)
  async getApprovalStatus(@Req() request) {
    const userId = request.user.userInfo.id;
    try {
      const status = await this.userService.getUserApprovalStatus(userId);
      return status;
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }
  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() request, @Res() res: Response) {
    const user = await this.userService.getUserById(request.user.userInfo.id);
    if (!user) {
      res.sendStatus(404);
    }
    res.json(user);
  }
  @UseGuards(JwtAuthGuard)
  @Get('/')
  async getUsers(
    @Res() response: Response,
    @Req() request,
    @Query('_sort') sort,
    @Query('_order') order,
    @Query('q') q,
  ) {
    const users = await this.userService.getUsers(
      request.user.userInfo.id,
      sort,
      order,
      q,
    );
    if (!users) {
      response.sendStatus(404);
    }
    response.json(users);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/get_chat')
  async getUsersForChat(@Res() response: Response, @Req() request) {
    const users = await this.userService.getUsersForChat(
      request.user.userInfo.id,
    );
    response.json(users);
  }

  @Get('/:id')
  async getUserById(
    @Param() params: { id: string },
    @Res() response: Response,
  ) {
    const user = await this.userService.getUserById(params.id);
    if (!user) {
      response.sendStatus(404);
    }
    response.json(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile/:id')
  async getProfileById(
    @Param() params: { id: string },
    @Res() response: Response,
    @Req() request,
  ) {
    const user = await this.userService.getUserById(
      params.id,
      request.user.userInfo.id,
    );
    if (!user) {
      response.sendStatus(404);
    }
    response.json(user);
  }

  @Put('/:id')
  async updateUserById(
    @Param() params: { id: string },
    @Res() response: Response,
    @Body() body: UserProfileView,
  ) {
    const user = await this.userService.getUserById(params.id);

    if (!user) {
      response.sendStatus(404);
    }
    const updatedUser = await this.userService.updateUserById(params.id, body);
    response.json(updatedUser);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Req() request,
  ) {
    try {
      const result = await this.fileService.uploadFile(file);
      this.userService.saveImage(request.user.userInfo.id, result.url);
      return res.json({
        message: 'Файл успішно завантажено',
        url: result.url,
      });
    } catch (error) {
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe/:id')
  async subscribeToUser(
    @Param() params: { id: string },
    @Res() res: Response,
    @Req() request,
  ) {
    const result = await this.userService.subscribeToUser(
      params.id,
      request.user.userInfo.id,
    );
    result ? res.sendStatus(201) : res.sendStatus(400);
    return;
  }
  @UseGuards(JwtAuthGuard)
  @Delete('unsubscribe/:id')
  async unSubscribeToUser(
    @Param() params: { id: string },
    @Res() res: Response,
    @Req() request,
  ) {
    const result = await this.userService.unSubscribeToUser(
      params.id,
      request.user.userInfo.id,
    );
    result.affected > 0 ? res.sendStatus(204) : res.sendStatus(400);
    return;
  }


}
