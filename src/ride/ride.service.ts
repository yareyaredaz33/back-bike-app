import { Injectable } from '@nestjs/common';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RideEntity } from '../DB/Entities/ride.entity';
import { UserEntityRide } from '../DB/Entities/user.entity.ride';
import { NotificationsEntity } from '../DB/Entities/notifications.entity';

@Injectable()
export class RideService {
  constructor(
    @InjectRepository(RideEntity)
    private rideEntityRepository: Repository<RideEntity>,
    @InjectRepository(UserEntityRide)
    private userRideEntity: Repository<UserEntityRide>,
    @InjectRepository(NotificationsEntity)
    private notificationRepository: Repository<NotificationsEntity>,
  ) {}
  create(createRideDto: CreateRideDto, userId: string) {
    // @ts-ignore
    const ride = this.rideEntityRepository.create({
      user_count: createRideDto.usersCount,
      description: createRideDto.description,
      title: createRideDto.title,
      road_id: createRideDto.roadId,
      date: createRideDto.date,
      user_id: userId,
      road: createRideDto.roadId,
    });
    const rideEntity = this.rideEntityRepository.save(ride);
    return rideEntity;
  }

  async findAll(userId?) {
    if (userId) {
      const ids = await this.userRideEntity.find({
        where: { user_id: userId },
      });
      const newIds = ids.map((id) => id.ride_id);
      console.log(newIds);
      return this.rideEntityRepository.find({ where: { id: In(newIds) } });
    }
    return this.rideEntityRepository.find();
  }

  async findOne(id: string, userId: string) {
    const result = await this.rideEntityRepository.findOne({ where: { id } });
    const [, rideCount] = await this.userRideEntity
      .createQueryBuilder('ride')
      .where({ ride_id: id })
      .getManyAndCount();
    const isApplied = await this.userRideEntity.findOne({
      where: { user_id: userId, ride_id: id },
    });
    if (isApplied) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      result.isApplied = true;
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      result.isApplied = false;
    }
    // @ts-ignore
    result.current_user_count = rideCount + 1;
    return result;
  }

  update(id: number, updateRideDto: UpdateRideDto) {
    return `This action updates a #${id} ride`;
  }

  remove(id: string) {
    return this.rideEntityRepository.delete({ id });
  }

  async applyToRide({ id: user_id, username }: any, id: string) {
    const subscriptions = await this.userRideEntity.save({
      ride_id: id,
      user_id: user_id,
    });
    this.notificationRepository.save({
      title: 'Ура',
      description: `Ваш друг ${username} приєднався до нової поїздки`,
      user_id: user_id,
      ride_id: id,
    });
    return subscriptions;
  }

  async unApplyToRide({ id: user_id, username }: any, id: string) {
    const subscriptions = await this.userRideEntity.delete({
      ride_id: id,
      user_id: user_id,
    });
    this.notificationRepository.save({
      title: 'Тільки не це',
      description: `Ваш друг ${username} відмовився від поїздки`,
      user_id: user_id,
      ride_id: id,
    });
    return subscriptions;
  }

  findAllForUser(userId: string) {
    return this.rideEntityRepository
      .createQueryBuilder('ride')
      .where({ user_id: userId })
      .orderBy('ride.createdat', 'DESC')
      .getMany();
  }
}
