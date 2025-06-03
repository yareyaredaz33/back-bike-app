import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';
import { BannedUserGuard } from '../Auth/Guards/banned-user.guard';
import { AdminGuard } from '../Auth/Guards/admin.guards';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, BannedUserGuard)
  create(@Body() createCommentDto: CreateCommentDto, @Req() req) {
    return this.commentsService.create(createCommentDto, req.user.userInfo.id);
  }

  @Get()
  findAll(@Query('articleId') articleId: string) {
    return this.commentsService.findAll(articleId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req
  ) {
    return this.commentsService.update(id, updateCommentDto, req.user.userInfo.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req) {
    return this.commentsService.remove(id, req.user.userInfo.id);
  }
}

@Controller('admin/comments')
export class AdminCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  adminRemove(@Param('id') id: string) {
    return this.commentsService.adminRemove(id);
  }
}
