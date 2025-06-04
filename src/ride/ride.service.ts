import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { RideEntity } from '../DB/Entities/ride.entity';
import { UserEntityRide } from '../DB/Entities/user.entity.ride';
import { NotificationsEntity } from '../DB/Entities/notifications.entity';
import { Payment } from '../DB/Entities/Payment';
import { UserLevelEntity } from '../DB/Entities/level.entity';
import { AchievementCronService } from '../achievment/achievement-cron.service';
import { LevelService } from '../level/level.service';
import { CreateRideApplicationDto } from './dto/create-ride-application.dto';
import { UserEntity } from '../DB/Entities/user.entity';
import {
  ApplicationStatus,
  RideApplicationEntity,
} from '../DB/Entities/ride-application.entity';
import { UpdateRideApplicationDto } from './dto/update-ride-application.dto';

interface RecommendedRideWithScore extends RideEntity {
  confidenceScore: number;
}

@Injectable()
export class RideService {
  constructor(
    @InjectRepository(RideEntity)
    private rideEntityRepository: Repository<RideEntity>,
    @InjectRepository(UserEntityRide)
    private userRideEntity: Repository<UserEntityRide>,
    @InjectRepository(RideApplicationEntity)
    private rideApplicationRepository: Repository<RideApplicationEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(NotificationsEntity)
    private notificationRepository: Repository<NotificationsEntity>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(UserLevelEntity)
    private userLevelRepository: Repository<UserLevelEntity>,
    private achievementCronService: AchievementCronService,
    private levelService: LevelService,
  ) {}

  async create(createRideDto: CreateRideDto, userId: string) {
    const ride = this.rideEntityRepository.create({
      // @ts-ignore
      user_count: createRideDto.usersCount,
      description: createRideDto.description,
      title: createRideDto.title,
      road_id: createRideDto.roadId,
      date: createRideDto.date,
      user_id: userId,
      road: createRideDto.roadId,
      isPaid: createRideDto.isPaid,
      price: createRideDto.price || 0,
      distance: createRideDto.distance,
      duration: createRideDto.duration,
    });
    const rideEntity = await this.rideEntityRepository.save(ride);

    // Додаємо XP за створення поїздки
    const xpInfo = await this.levelService.addRideXP(
      userId,
      createRideDto.distance || 0,
      createRideDto.duration || 0,
    );

    // Перевіряємо досягнення
    await this.achievementCronService.checkUserAchievementsAfterRide(userId);

    return {
      ...rideEntity,
      xpEarned: xpInfo.xpEarned,
      xpBreakdown: xpInfo.xpBreakdown,
      levelInfo: xpInfo.updatedLevel,
    };
  }

  async findAll(userId?: string, search?: string) {
    // Якщо вказано userId, повертаємо поїздки цього користувача
    if (userId) {
      const ids = await this.userRideEntity.find({
        where: { user_id: userId },
      });
      const newIds = ids.map((id) => id.ride_id);

      if (newIds.length === 0) {
        return [];
      }

      return this.rideEntityRepository.find({ where: { id: In(newIds) } });
    }

    // Якщо вказано пошуковий запит, шукаємо за ним
    if (search && search.trim() !== '') {
      return this.rideEntityRepository.find({
        where: [
          { title: Like(`%${search}%`) },
          { description: Like(`%${search}%`) },
        ],
        order: {
          createdat: 'DESC',
        },
      });
    }

    // Інакше повертаємо всі поїздки
    return this.rideEntityRepository.find({
      order: {
        createdat: 'DESC',
      },
    });
  }

  async getRecommendedRides(
    userId: string,
  ): Promise<RecommendedRideWithScore[]> {
    // 1. Отримуємо інформацію про користувача
    const userLevel = await this.userLevelRepository.findOne({
      where: { user_id: userId },
    });

    // Якщо рівень не знайдено, встановлюємо значення за замовчуванням
    const userLevelValue = userLevel ? userLevel.level : 1;

    // 2. Отримуємо попередні поїздки користувача
    const userRideIds = await this.userRideEntity.find({
      where: { user_id: userId },
    });
    const userRideIdsOwned = await this.rideEntityRepository.find({
      where: { user_id: userId },
    });
    const userRideIdsAll = [
      ...userRideIds,
      ...userRideIdsOwned.map((ride) => ({ ride_id: ride.id })),
    ];
    const pastRides =
      userRideIdsAll.length > 0
        ? await this.rideEntityRepository.find({
            where: { id: In(userRideIdsAll.map((r) => r.ride_id)) },
          })
        : [];

    // 3. Розраховуємо середні показники користувача
    const userStats = {
      avgDistance: pastRides.length
        ? pastRides.reduce((sum, ride) => sum + (ride.distance || 0), 0) /
          pastRides.length
        : 0,
      avgDuration: pastRides.length
        ? pastRides.reduce((sum, ride) => sum + (ride.duration || 0), 0) /
          pastRides.length
        : 0,
      preferredTimeOfDay: this.getPreferredTimeOfDay(pastRides),
      isPaidRides:
        pastRides.filter((ride) => ride.isPaid).length > pastRides.length / 2,
    };

    // 4. Отримуємо всі доступні поїздки
    const allRides = await this.rideEntityRepository.find({
      order: {
        date: 'ASC',
      },
    });

    console.log(allRides);
    // Фільтруємо поїздки, щоб виключити ті, в яких користувач вже бере часть
    const userParticipatingRideIds = new Set(userRideIds.map((r) => r.ride_id));
    console.log(userParticipatingRideIds);
    const availableRides = allRides.filter(
      (ride) => !userParticipatingRideIds.has(ride.id),
    );
    console.log(availableRides);
    // 5. Розраховуємо показник впевненості для кожної поїздки
    const recommendedRides = availableRides.map((ride) => {
      const confidenceScore = this.calculateConfidenceScore(
        ride,
        userStats,
        userLevelValue,
      );

      return {
        ...ride,
        confidenceScore,
      };
    });

    // 6. Сортуємо за показником впевненості та обмежуємо результат
    return recommendedRides
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 10);
  }

  private getDateFilter(): any {
    const now = new Date();
    // Повертаємо фільтр для TypeORM, щоб отримати лише майбутні поїздки
    return `> '${now.toISOString()}'`;
  }

  private getPreferredTimeOfDay(rides: RideEntity[]): string {
    if (rides.length === 0) return 'any';

    const timeCounts = {
      morning: 0, // 6:00 - 12:00
      afternoon: 0, // 12:00 - 18:00
      evening: 0, // 18:00 - 22:00
      night: 0, // 22:00 - 6:00
    };

    for (const ride of rides) {
      if (!ride.date) continue;

      const date = new Date(ride.date);
      const hours = date.getHours();

      if (hours >= 6 && hours < 12) {
        timeCounts.morning++;
      } else if (hours >= 12 && hours < 18) {
        timeCounts.afternoon++;
      } else if (hours >= 18 && hours < 22) {
        timeCounts.evening++;
      } else {
        timeCounts.night++;
      }
    }

    // Знаходимо час доби з найбільшою кількістю поїздок
    let maxCount = 0;
    let preferredTime = 'any';

    for (const [time, count] of Object.entries(timeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        preferredTime = time;
      }
    }

    return preferredTime;
  }

  private calculateConfidenceScore(
    ride: RideEntity,
    userStats: any,
    userLevel: number,
  ): number {
    let score = 70; // Базовий показник

    // 1. Відстань - якщо відстань близька до середньої для користувача, збільшуємо показник
    if (userStats.avgDistance > 0) {
      const distanceRatio = ride.distance / userStats.avgDistance;

      // Якщо відстань в межах 70-130% від середньої - це добре
      if (distanceRatio >= 0.7 && distanceRatio <= 1.3) {
        score += 10;
      }
      // Якщо відстань занадто велика для початківця
      else if (distanceRatio > 1.5 && userLevel < 3) {
        score -= 15;
      }
      // Якщо відстань занадто мала для досвідченого користувача
      else if (distanceRatio < 0.7 && userLevel > 5) {
        score -= 5;
      }
      // Якщо відстань трохи більша за середню - це хороша можливість для прогресу
      else if (distanceRatio > 1 && distanceRatio <= 1.5) {
        score += 5;
      }
    } else {
      // Якщо у користувача немає історії, рекомендуємо короткі поїздки для початківців
      if (userLevel < 3 && ride.distance < 10000) {
        // менше 10 км
        score += 15;
      }
    }

    // 2. Тривалість - аналогічно до відстані
    if (userStats.avgDuration > 0) {
      const durationRatio = ride.duration / userStats.avgDuration;

      if (durationRatio >= 0.7 && durationRatio <= 1.3) {
        score += 10;
      } else if (durationRatio > 1.5 && userLevel < 3) {
        score -= 15;
      } else if (durationRatio < 0.7 && userLevel > 5) {
        score -= 5;
      } else if (durationRatio > 1 && durationRatio <= 1.5) {
        score += 5;
      }
    } else {
      if (userLevel < 3 && ride.duration < 60) {
        // менше 1 години
        score += 15;
      }
    }

    // 3. Час доби - якщо співпадає з преференціями користувача
    if (userStats.preferredTimeOfDay !== 'any' && ride.date) {
      const rideDate = new Date(ride.date);
      const hours = rideDate.getHours();

      let rideTimeOfDay = 'any';
      if (hours >= 6 && hours < 12) rideTimeOfDay = 'morning';
      else if (hours >= 12 && hours < 18) rideTimeOfDay = 'afternoon';
      else if (hours >= 18 && hours < 22) rideTimeOfDay = 'evening';
      else rideTimeOfDay = 'night';

      if (rideTimeOfDay === userStats.preferredTimeOfDay) {
        score += 10;
      }
    }

    // 4. Платна чи безкоштовна - відповідно до преференцій користувача
    if (
      (ride.isPaid && userStats.isPaidRides) ||
      (!ride.isPaid && !userStats.isPaidRides)
    ) {
      score += 5;
    }

    // 5. Рівень користувача - для початківців більше підходять короткі поїздки
    if (userLevel < 3) {
      // Для початківців короткі поїздки краще
      if (ride.distance < 15000 && ride.duration < 90) {
        // менше 15 км і 1.5 години
        score += 10;
      }
    } else if (userLevel >= 3 && userLevel < 6) {
      // Для середнього рівня - середні дистанції
      if (ride.distance >= 15000 && ride.distance < 40000) {
        // 15-40 км
        score += 10;
      }
    } else {
      // Для досвідчених - більші дистанції
      if (ride.distance >= 40000) {
        // 40+ км
        score += 10;
      }
    }

    // 6. Інші фактори (можна додати при необхідності)

    // Нормалізуємо показник до діапазону 0-100
    return Math.min(Math.max(score, 0), 100);
  }

  async findOne(id: string, userId: string) {
    const result = await this.rideEntityRepository.findOne({ where: { id } });
    const [, rideCount] = await this.userRideEntity
      .createQueryBuilder('ride')
      .where({ ride_id: id })
      .getManyAndCount();
    const wasPaid = await this.paymentRepository.find({
      where: { ride_id: id, user_id: userId },
    });
    console.log(wasPaid);
    const isApplied = await this.userRideEntity.findOne({
      where: { user_id: userId, ride_id: id },
    });
    if (wasPaid.find((e) => e.status === 'succeeded')) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      result.wasPaid = true;
    }
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

  async applyToRide(
    { id: user_id, username }: any,
    rideId: string,
    applicationDto?: CreateRideApplicationDto,
  ) {
    // Перевіряємо, чи поїздка існує
    const ride = await this.rideEntityRepository.findOne({
      where: { id: rideId },
    });

    if (!ride) {
      throw new BadRequestException('Поїздка не знайдена');
    }

    // Отримуємо інформацію про створювача поїздки
    const rideCreator = await this.userRepository.findOne({
      where: { id: ride.user_id },
    });

    // Перевіряємо, чи користувач вже подавав заявку
    const existingApplication = await this.rideApplicationRepository.findOne({
      where: { user_id, ride_id: rideId },
    });

    if (existingApplication) {
      throw new BadRequestException('Ви вже подали заявку на цю поїздку');
    }

    // Перевіряємо, чи користувач вже приєднаний
    const existingParticipation = await this.userRideEntity.findOne({
      where: { user_id, ride_id: rideId },
    });

    if (existingParticipation) {
      throw new BadRequestException('Ви вже приєднані до цієї поїздки');
    }

    // Якщо створювач поїздки є тренером, створюємо заявку
    if (rideCreator && rideCreator.role === 'trainer') {
      const application = await this.rideApplicationRepository.save({
        user_id,
        ride_id: rideId,
        message: applicationDto?.message,
        status: ApplicationStatus.PENDING,
      });

      // Відправляємо нотифікацію тренеру
      await this.notificationRepository.save({
        title: 'Нова заявка на поїздку',
        description: `${username} подав заявку на участь у вашій поїздці "${ride.title}"`,
        user_id: ride.user_id,
        ride_id: rideId,
      });

      return {
        type: 'application',
        application,
        message: 'Заявка подана. Очікуйте підтвердження від тренера.',
      };
    } else {
      // Якщо це не тренер, приєднуємося напряму (як було раніше)
      return this.directJoinRide(user_id, username, rideId, ride);
    }
  }

  // Допоміжний метод для прямого приєднання
  private async directJoinRide(
    user_id: string,
    username: string,
    rideId: string,
    ride: RideEntity,
  ) {
    const subscription = await this.userRideEntity.save({
      ride_id: rideId,
      user_id: user_id,
    });

    await this.notificationRepository.save({
      title: 'Ура',
      description: `${username} приєднався до нової поїздки`,
      user_id: user_id,
      ride_id: rideId,
    });

    // Додаємо XP за приєднання до поїздки
    if (ride) {
      const xpInfo = await this.levelService.addRideXP(
        user_id,
        ride.distance || 0,
        ride.duration || 0,
      );

      await this.achievementCronService.checkUserAchievementsAfterRide(user_id);
    }

    return {
      type: 'direct_join',
      subscription,
      message: 'Ви успішно приєдналися до поїздки!',
    };
  }

  // Підтвердження або відхилення заявки тренером
  async handleRideApplication(
    trainerId: string,
    applicationId: string,
    updateDto: UpdateRideApplicationDto,
  ) {
    const application = await this.rideApplicationRepository.findOne({
      where: { id: applicationId },
      relations: ['ride', 'user'],
    });

    if (!application) {
      throw new BadRequestException('Заявка не знайдена');
    }

    // Перевіряємо, чи користувач є тренером і створювачем поїздки
    if (application.ride.user_id !== trainerId) {
      throw new ForbiddenException('Ви не можете управляти цією заявкою');
    }

    // Оновлюємо статус заявки
    application.status = updateDto.status;
    application.trainer_notes = updateDto.trainer_notes;

    await this.rideApplicationRepository.save(application);

    // Якщо заявка схвалена, додаємо користувача до поїздки
    if (updateDto.status === ApplicationStatus.APPROVED) {
      await this.userRideEntity.save({
        ride_id: application.ride_id,
        user_id: application.user_id,
      });

      // Додаємо XP за приєднання до поїздки
      const xpInfo = await this.levelService.addRideXP(
        application.user_id,
        application.ride.distance || 0,
        application.ride.duration || 0,
      );

      await this.achievementCronService.checkUserAchievementsAfterRide(
        application.user_id,
      );
    }

    // Відправляємо нотифікацію користувачу
    const notificationTitle =
      updateDto.status === ApplicationStatus.APPROVED
        ? 'Заявка схвалена!'
        : 'Заявка відхилена';

    const notificationDescription =
      updateDto.status === ApplicationStatus.APPROVED
        ? `Ваша заявка на поїздку "${application.ride.title}" була схвалена тренером`
        : `Ваша заявка на поїздку "${application.ride.title}" була відхилена тренером`;

    await this.notificationRepository.save({
      title: notificationTitle,
      description: notificationDescription,
      user_id: application.user_id,
      ride_id: application.ride_id,
    });

    return application;
  }

  // Отримання заявок для тренера
// Простий метод без joins - тільки пошук по userId
  async getApplicationsForTrainer(trainerId: string, rideId?: string) {
    // 1. Спочатку отримуємо всі поїздки тренера
    const trainerRides = await this.rideEntityRepository.find({
      where: { user_id: trainerId }
    });

    if (trainerRides.length === 0) {
      return [];
    }

    const trainerRideIds = trainerRides.map(ride => ride.id);

    // 2. Отримуємо заявки для поїздок тренера
    let whereCondition: any = { ride_id: In(trainerRideIds) };

    if (rideId) {
      whereCondition = { ride_id: rideId };
    }

    const applications = await this.rideApplicationRepository.find({
      where: whereCondition,
      order: { created_at: 'DESC' }
    });

    if (applications.length === 0) {
      return [];
    }

    // 3. Додаємо дані для кожної заявки
    const applicationsWithData = await Promise.all(
      applications.map(async (application) => {
        // Отримуємо інформацію про користувача
        const user = await this.userRepository.findOne({
          where: { id: application.user_id }
        });

        // Отримуємо інформацію про поїздку
        const ride = await this.rideEntityRepository.findOne({
          where: { id: application.ride_id }
        });

        // Отримуємо рівень користувача
        const userLevel = await this.userLevelRepository.findOne({
          where: { user_id: application.user_id }
        });

        // Отримуємо статистику користувача
        const userStats = await this.getUserSimpleStats(application.user_id);

        return {
          ...application,
          user: user ? {
            id: user.id,
            username: user.username,
            first: user.first,
            lastname: user.lastname,
            avatar: user.avatar,
            role: user.role,
          } : null,
          ride: ride ? {
            id: ride.id,
            title: ride.title,
            date: ride.date,
            distance: ride.distance,
            duration: ride.duration,
          } : null,
          userStats: {
            ...userStats,
            level: userLevel?.level || 1,

          }
        };
      })
    );

    return applicationsWithData.filter(app => app.user && app.ride);
  }

// Допоміжний метод для отримання простої статистики користувача
  private async getUserSimpleStats(userId: string) {
    // Отримуємо поїздки, до яких приєднувався користувач
    const userRideRecords = await this.userRideEntity.find({
      where: { user_id: userId }
    });

    // Отримуємо поїздки, які створив користувач
    const createdRides = await this.rideEntityRepository.find({
      where: { user_id: userId }
    });

    // Статистика приєднаних поїздок
    let joinedDistance = 0;
    let joinedDuration = 0;

    if (userRideRecords.length > 0) {
      const joinedRideIds = userRideRecords.map(ur => ur.ride_id);
      const joinedRides = await this.rideEntityRepository.find({
        where: { id: In(joinedRideIds) }
      });

      joinedDistance = joinedRides.reduce((sum, ride) => sum + (ride.distance || 0), 0);
      joinedDuration = joinedRides.reduce((sum, ride) => sum + (ride.duration || 0), 0);
    }

    // Статистика створених поїздок
    const createdDistance = createdRides.reduce((sum, ride) => sum + (ride.distance || 0), 0);
    const createdDuration = createdRides.reduce((sum, ride) => sum + (ride.duration || 0), 0);

    // Загальна статистика
    const totalRides = userRideRecords.length + createdRides.length;
    const totalDistance = joinedDistance + createdDistance;
    const totalDuration = joinedDuration + createdDuration;

    return {
      // Приєднані поїздки
      joinedRides: userRideRecords.length,
      joinedDistance: joinedDistance,
      joinedDuration: joinedDuration,

      // Створені поїздки
      createdRides: createdRides.length,
      createdDistance: createdDistance,
      createdDuration: createdDuration,

      // Загальна статистика
      totalRides: totalRides,
      totalDistance: totalDistance,
      totalDuration: totalDuration,

      // Середні показники
      avgDistance: totalRides > 0 ? Math.round(totalDistance / totalRides) : 0,
      avgDuration: totalRides > 0 ? Math.round(totalDuration / totalRides) : 0,
    };
  }



// Спрощений метод отримання заявок користувача
  async getUserApplications(userId: string) {
    const applications = await this.rideApplicationRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' }
    });

    // Додаємо інформацію про поїздки
    const applicationsWithRides = await Promise.all(
      applications.map(async (application) => {
        const ride = await this.rideEntityRepository.findOne({
          where: { id: application.ride_id }
        });

        return {
          ...application,
          ride: ride ? {
            id: ride.id,
            title: ride.title,
            date: ride.date,
            distance: ride.distance,
            duration: ride.duration,
          } : null
        };
      })
    );

    return applicationsWithRides.filter(app => app.ride);
  }

// Спрощений метод отримання заявок для конкретної поїздки
  async getRideApplications(rideId: string) {
    const applications = await this.rideApplicationRepository.find({
      where: { ride_id: rideId },
      order: { created_at: 'DESC' }
    });

    // Додаємо інформацію про користувачів
    const applicationsWithUsers = await Promise.all(
      applications.map(async (application) => {
        const user = await this.userRepository.findOne({
          where: { id: application.user_id }
        });

        // Отримуємо базову статистику користувача
        const userStats = await this.getUserSimpleStats(application.user_id);

        const userLevel = await this.userLevelRepository.findOne({
          where: { user_id: application.user_id }
        });

        return {
          ...application,
          user: user ? {
            id: user.id,
            username: user.username,
            first: user.first,
            lastname: user.lastname,
            avatar: user.avatar,
            role: user.role,
          } : null,
          userStats: {
            ...userStats,
            level: userLevel?.level || 1,
          }
        };
      })
    );

    return applicationsWithUsers.filter(app => app.user);
  }
  // Також додайте допоміжний метод для отримання детальної статистики користувача
  async getUserDetailedStats(userId: string) {
    // Статистика приєднаних поїздок
    const joinedStats = await this.userRideEntity
      .createQueryBuilder('userRide')
      .leftJoin(RideEntity, 'ride', 'ride.id = userRide.ride_id')
      .select([
        'COUNT(*) as joinedCount',
        'COALESCE(SUM(ride.distance), 0) as joinedDistance',
        'COALESCE(SUM(ride.duration), 0) as joinedDuration',
        'COALESCE(AVG(ride.distance), 0) as avgJoinedDistance',
        'COALESCE(AVG(ride.duration), 0) as avgJoinedDuration',
      ])
      .where('userRide.user_id = :userId', { userId })
      .getRawOne();

    // Статистика створених поїздок
    const createdStats = await this.rideEntityRepository
      .createQueryBuilder('ride')
      .select([
        'COUNT(*) as createdCount',
        'COALESCE(SUM(ride.distance), 0) as createdDistance',
        'COALESCE(SUM(ride.duration), 0) as createdDuration',
        'COALESCE(AVG(ride.distance), 0) as avgCreatedDistance',
        'COALESCE(AVG(ride.duration), 0) as avgCreatedDuration',
      ])
      .where('ride.user_id = :userId', { userId })
      .getRawOne();

    // Останні поїздки
    const recentRides = await this.userRideEntity
      .createQueryBuilder('userRide')
      .leftJoinAndSelect('userRide.ride', 'ride')
      .where('userRide.user_id = :userId', { userId })
      .orderBy('ride.date', 'DESC')
      .limit(5)
      .getMany();

    // Рівень користувача
    const userLevel = await this.userLevelRepository.findOne({
      where: { user_id: userId },
    });

    return {
      joined: {
        count: parseInt(joinedStats.joinedCount) || 0,
        totalDistance: parseInt(joinedStats.joinedDistance) || 0,
        totalDuration: parseInt(joinedStats.joinedDuration) || 0,
        avgDistance: parseFloat(joinedStats.avgJoinedDistance) || 0,
        avgDuration: parseFloat(joinedStats.avgJoinedDuration) || 0,
      },
      created: {
        count: parseInt(createdStats.createdCount) || 0,
        totalDistance: parseInt(createdStats.createdDistance) || 0,
        totalDuration: parseInt(createdStats.createdDuration) || 0,
        avgDistance: parseFloat(createdStats.avgCreatedDistance) || 0,
        avgDuration: parseFloat(createdStats.avgCreatedDuration) || 0,
      },
      overall: {
        totalRides:
          (parseInt(joinedStats.joinedCount) || 0) +
          (parseInt(createdStats.createdCount) || 0),
        totalDistance:
          (parseInt(joinedStats.joinedDistance) || 0) +
          (parseInt(createdStats.createdDistance) || 0),
        totalDuration:
          (parseInt(joinedStats.joinedDuration) || 0) +
          (parseInt(createdStats.createdDuration) || 0),
      },
      level: {
        level: userLevel?.level || 1,
        // @ts-ignore
        experience: userLevel?.experience || 0,
      },
      // @ts-ignore
      recentRides: recentRides.map((ur) => ur.ride).filter(Boolean),
    };
  }

  // Перевірка статусу заявки
  async getApplicationStatus(userId: string, rideId: string) {
    const application = await this.rideApplicationRepository.findOne({
      where: { user_id: userId, ride_id: rideId },
    });

    return application?.status || null;
  }
  async unApplyToRide({ id: user_id, username }: any, id: string) {
    const subscriptions = await this.userRideEntity.delete({
      ride_id: id,
      user_id: user_id,
    });

    await this.notificationRepository.save({
      title: 'Тільки не це',
      description: `Ваш друг ${username} відмовився від поїздки`,
      user_id: user_id,
      ride_id: id,
    });

    return subscriptions;
  }

  async findAllForUser(userId: string) {
    const ride_ids =  await this.userRideEntity.find({
      where: { user_id: userId }
    })

    const ids = ride_ids.map((ride) => ride.ride_id);
    const rides = await this.rideEntityRepository.find({
      where: { id: In(ids) },
      order: {
        date: 'ASC',
      },
    })
    const userRides = await this.rideEntityRepository.find({
      where: { user_id: userId },
      order: {
        date: 'ASC',
      },
    })
    return [...rides, ...userRides];
  }
}
