import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { RoadService } from './road.service';
import { CreateRoadDto } from './dto/create-road.dto';
import { UpdateRoadDto } from './dto/update-road.dto';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';
import { Response } from 'express';

@Controller('road')
export class RoadController {
  constructor(private readonly roadService: RoadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createRoadDto: CreateRoadDto, @Req() request) {
    return this.roadService.create(createRoadDto, request.user.userInfo);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() request) {
    const result = await this.roadService.findAll(request.user.userInfo);
    return result;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roadService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoadDto: UpdateRoadDto) {
    return this.roadService.update(+id, updateRoadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Res() response: Response) {
    const result = this.roadService.remove(id);
    if (result) response.sendStatus(204);
    else response.sendStatus(404);
  }
}
