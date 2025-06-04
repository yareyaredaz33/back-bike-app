import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
  Query,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileService } from '../User/file.service';

@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly fileService: FileService,
  ) {}
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createArticleDto: CreateArticleDto, @Req() req) {
    return this.articlesService.create(createArticleDto, req.user.userInfo.id);
  }

  @Get()
  findAll(@Query('_sort') sort, @Query('_order') order, @Query('q') q) {
    return this.articlesService.findAll(sort, order, q);
  }

  @Get('/user-posts/:id')
  findAllForUser(@Param('id') id: string) {
    return this.articlesService.findAllForUser(id);
  }

  @Get('/user-posts')
  @UseGuards(JwtAuthGuard)
  findAllForCurrentUser(@Param('id') id: string, @Req() req) {
    return this.articlesService.findAllForUser(req.user.userInfo.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() request) {
    const article = await this.articlesService.findOne(id);
    return {
      ...article,
      canBeDeleted: article.user.id === request.user.userInfo.id,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @Req() req
  ) {
    return this.articlesService.update(+id, updateArticleDto, req.user.userInfo.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() req) {
    return this.articlesService.remove(id, req.user.userInfo.id);
  }

  @UseGuards(JwtAuthGuard, BannedUserGuard)
  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Req() request,
  ) {
    try {
      console.log(file);
      const result = await this.fileService.uploadFile(file);
      return res.json({
        message: 'Файл успішно завантажено',
        url: result.url,
      });
    } catch (error) {
      console.log(error);
    }
  }
}

@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  adminRemove(@Param('id') id: string) {
    return this.articlesService.adminRemove(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAllForAdmin(@Query('_sort') sort, @Query('_order') order, @Query('q') q) {
    return this.articlesService.findAll(sort, order, q);
  }
}
