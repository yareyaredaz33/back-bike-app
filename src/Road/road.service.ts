import { Injectable } from '@nestjs/common';
import { CreateRoadDto } from './dto/create-road.dto';
import { UpdateRoadDto } from './dto/update-road.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoadEntity } from '../DB/Entities/road.entity';

@Injectable()
export class RoadService {
  constructor(
    @InjectRepository(RoadEntity)
    private roadEntityRepository: Repository<RoadEntity>,
  ) {}

  create(
    createRoadDto: CreateRoadDto,
    userInfo: { id: string; email: string; username: string },
  ) {
    const road = this.roadEntityRepository.create({
      user_id: userInfo.id,
      finish_mark: createRoadDto.finishMark,
      start_mark: createRoadDto.startMark,
      waypoints: createRoadDto.waypoints,
      title: createRoadDto.title,
    });
    const roadEntity = this.roadEntityRepository.save(road);
    return roadEntity;
  }

  async findAll({ id }) {
    const result = await this.roadEntityRepository.find({
      where: { user_id: id },
      take: 10,
    });
    return result.map((road) => {
      return {
        id: road.id,
        finishMark: road.finish_mark,
        startMark: road.start_mark,
        waypoints: road.waypoints,
        title: road?.title,
      };
    });
  }

  async findOne(id: string) {
    const result = await this.roadEntityRepository.findOne({ where: { id } });
    if (!result) return null;
    return {
      waypoints: result.waypoints,
      finishMark: result.finish_mark,
      startMark: result.start_mark,
      id: result.id,
    };
  }

  update(id: number, updateRoadDto: UpdateRoadDto) {
    return `This action updates a #${id} road`;
  }

  async remove(id: string) {
    const result = await this.roadEntityRepository.delete(id);
    return result.affected > 0;
  }
}
