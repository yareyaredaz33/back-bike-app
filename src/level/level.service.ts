import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonthlyGoalEntity, MonthlyStatsEntity, UserLevelEntity } from '../DB/Entities/level.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { NotificationsEntity } from '../DB/Entities/notifications.entity';
import { AchievementEntity, UserAchievementEntity } from '../DB/Entities/achivement.entity';
import { LEVEL_TITLES, MAX_LEVEL, XP_REQUIREMENTS, XP_REWARDS } from '../DB/Entities/level.contstants';

@Injectable()
export class LevelService {

  private readonly logger = new Logger(LevelService.name);

  constructor(
    @InjectRepository(UserLevelEntity)
    private userLevelRepository: Repository<UserLevelEntity>,
    @InjectRepository(MonthlyGoalEntity)
    private monthlyGoalRepository: Repository<MonthlyGoalEntity>,
    @InjectRepository(MonthlyStatsEntity)
    private monthlyStatsRepository: Repository<MonthlyStatsEntity>,
    @InjectRepository(NotificationsEntity)
    private notificationRepository: Repository<NotificationsEntity>,
    @InjectRepository(AchievementEntity)
    private achievementRepository: Repository<AchievementEntity>,
    @InjectRepository(UserAchievementEntity)
    private userAchievementRepository: Repository<UserAchievementEntity>,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    // Запускаємо щоденну перевірку для оновлення місячної статистики
    this.setupDailyCheck();

    // Запускаємо щомісячну перевірку для перезапуску місячних цілей
    this.setupMonthlyReset();
  }

  // Налаштування щоденної перевірки місячних цілей (кожної ночі о 00:01)
  private setupDailyCheck() {
    try {
      // Перевіряємо чи вже існує cron з таким ім'ям
      this.schedulerRegistry.getCronJob('check-monthly-goals');
      this.logger.log('Cron job check-monthly-goals already exists');
    } catch (error) {
      // Якщо не існує, створюємо новий
      const job = new CronJob('1 0 * * *', () => {
        this.checkMonthlyGoals();
      });

      this.schedulerRegistry.addCronJob('check-monthly-goals', job);
      job.start();

      this.logger.log('Scheduled daily check for monthly goals');
    }
  }

  // Налаштування щомісячного скидання (першого числа кожного місяця о 00:05)
  private setupMonthlyReset() {
    try {
      // Перевіряємо чи вже існує cron з таким ім'ям
      this.schedulerRegistry.getCronJob('reset-monthly-stats');
      this.logger.log('Cron job reset-monthly-stats already exists');
    } catch (error) {
      // Якщо не існує, створюємо новий
      const job = new CronJob('5 0 1 * *', () => {
        this.resetMonthlyStats();
      });

      this.schedulerRegistry.addCronJob('reset-monthly-stats', job);
      job.start();

      this.logger.log('Scheduled monthly reset for user stats');
    }
  }


  // Отримання рівня користувача
  async getUserLevel(userId: string) {
    let userLevel = await this.userLevelRepository.findOne({
      where: { user_id: userId },
    });

    // Якщо рівень користувача не знайдено, створюємо початковий
    if (!userLevel) {
      userLevel = this.userLevelRepository.create({
        user_id: userId,
        level: 1,
        xp: 0,
        xp_to_next_level: XP_REQUIREMENTS[2],
      });

      await this.userLevelRepository.save(userLevel);
    }

    // Додаємо титул рівня та відсоток прогресу
    const currentLevel = userLevel.level;
    const nextLevel = currentLevel < MAX_LEVEL ? currentLevel + 1 : MAX_LEVEL;

    const currentLevelXP = XP_REQUIREMENTS[currentLevel];
    const nextLevelXP = XP_REQUIREMENTS[nextLevel];
    const xpForNextLevel = nextLevelXP - currentLevelXP;

    // Розрахунок прогресу до наступного рівня
    const xpProgress = userLevel.level < MAX_LEVEL
      ? Math.min(Math.floor(((userLevel.xp - currentLevelXP) / xpForNextLevel) * 100), 99)
      : 100;

    return {
      ...userLevel,
      title: LEVEL_TITLES[userLevel.level],
      progress: xpProgress,
      max_level: userLevel.level >= MAX_LEVEL,
    };
  }

  // Додавання XP користувачу
  async addUserXP(userId: string, xpAmount: number, reason: string) {
    let userLevel = await this.getUserLevel(userId);

    // Якщо користувач вже на максимальному рівні, не додаємо XP
    if (userLevel.max_level) {
      return userLevel;
    }

    // Оновлюємо XP
    const newXP = userLevel.xp + xpAmount;
    userLevel.xp = newXP;

    // Перевіряємо, чи достатньо XP для переходу на новий рівень
    let levelUp = false;
    let newLevel = userLevel.level;

    while (newLevel < MAX_LEVEL && newXP >= XP_REQUIREMENTS[newLevel + 1]) {
      newLevel++;
      levelUp = true;
    }

    // Оновлюємо рівень, якщо потрібно
    if (levelUp) {
      userLevel.level = newLevel;

      // Надсилаємо сповіщення про новий рівень
      await this.notificationRepository.save({
        title: 'Новий рівень!',
        description: `Вітаємо! Ви досягли рівня "${LEVEL_TITLES[newLevel]}"`,
        user_id: userId,
      });

      // Якщо це перехід на новий титул, додаємо досягнення
      const previousTitle = LEVEL_TITLES[userLevel.level - 1];
      const newTitle = LEVEL_TITLES[newLevel];

      if (previousTitle !== newTitle) {
        // Додаємо досягнення за новий титул
        const achievementTitle = `Новий ранг: ${newTitle}`;
        let achievement = await this.achievementRepository.findOne({
          where: { title: achievementTitle },
        });

        // Якщо такого досягнення немає, створюємо його
        if (!achievement) {
          achievement = this.achievementRepository.create({
            title: achievementTitle,
            description: `Вітаємо! Ви досягли рангу "${newTitle}"`,
            type: 'LEVEL',
            threshold: newLevel,
            icon: `level_${newLevel}`,
          });

          achievement = await this.achievementRepository.save(achievement);
        }

        // Додаємо досягнення користувачу
        await this.userAchievementRepository.save({
          user_id: userId,
          achievement_id: achievement.id,
          is_seen: false,
        });
      }
    }

    // Оновлюємо дані користувача
    await this.userLevelRepository.update(
      { id: userLevel.id },
      {
        xp: newXP,
        level: newLevel,
        xp_to_next_level: newLevel < MAX_LEVEL ? XP_REQUIREMENTS[newLevel + 1] - XP_REQUIREMENTS[newLevel] : 0,
        last_updated: new Date()
      }
    );

    // Повертаємо оновлені дані
    return this.getUserLevel(userId);
  }

  // Додавання XP за завершення поїздки
  async addRideXP(userId: string, distance: number, duration: number) {
    // Розраховуємо XP за поїздку
    const distanceKm = distance / 1000; // Конвертуємо метри в кілометри
    const durationMinutes = duration/60; // Конвертуємо секунди в хвилини
    const rideXP = XP_REWARDS.RIDE_COMPLETE;
    const distanceXP = Math.floor(distanceKm * XP_REWARDS.KM_TRAVELED);
    const durationXP = Math.floor(durationMinutes * XP_REWARDS.MINUTE_DURATION);

    const totalXP = rideXP + distanceXP + durationXP;

    // Додаємо XP користувачу
    const updatedLevel = await this.addUserXP(userId, totalXP, 'Завершення поїздки');

    // Оновлюємо місячну статистику
    await this.updateMonthlyStats(userId, distance, duration, 1);

    return {
      xpEarned: totalXP,
      xpBreakdown: {
        ride: rideXP,
        distance: distanceXP,
        duration: durationXP,
      },
      updatedLevel
    };
  }

  // Оновлення місячної статистики
  async updateMonthlyStats(userId: string, distance: number, duration: number, ridesCount: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() повертає 0-11

    let monthlyStats = await this.monthlyStatsRepository.findOne({
      where: {
        user_id: userId,
        year,
        month,
      },
    });

    if (!monthlyStats) {
      monthlyStats = this.monthlyStatsRepository.create({
        user_id: userId,
        year,
        month,
        distance: 0,
        duration: 0,
        rides_count: 0,
      });
    }

    // Оновлюємо статистику
    monthlyStats.distance += distance;
    monthlyStats.duration += duration;
    monthlyStats.rides_count += ridesCount;
    monthlyStats.updated_at = now;

    await this.monthlyStatsRepository.save(monthlyStats);

    // Перевіряємо чи виконано місячну ціль
    await this.checkMonthlyGoalForUser(userId, year, month);

    return monthlyStats;
  }

  // Перевірка чи виконано місячну ціль
  async checkMonthlyGoalForUser(userId: string, year: number, month: number) {
    const goal = await this.monthlyGoalRepository.findOne({
      where: {
        user_id: userId,
        year,
        month,
        completed: false,
      },
    });

    if (!goal) return null;

    const stats = await this.monthlyStatsRepository.findOne({
      where: {
        user_id: userId,
        year,
        month,
      },
    });

    if (!stats) return null;

    // Перевіряємо виконання цілі
    const distanceCompleted = stats.distance >= goal.distance_goal;
    const ridesCompleted = stats.rides_count >= goal.rides_goal;
    const durationCompleted = stats.duration >= goal.duration_goal;

    // Ціль вважається виконаною, якщо всі поставлені підцілі виконані
    const goalCompleted =
      (goal.distance_goal === 0 || distanceCompleted) &&
      (goal.rides_goal === 0 || ridesCompleted) &&
      (goal.duration_goal === 0 || durationCompleted);

    if (goalCompleted) {
      // Оновлюємо статус цілі
      await this.monthlyGoalRepository.update(
        { id: goal.id },
        { completed: true }
      );

      // Додаємо XP за виконану ціль
      await this.addUserXP(userId, XP_REWARDS.MONTHLY_GOAL_COMPLETED, 'Виконання місячної цілі');

      // Додаємо досягнення за виконану місячну ціль
      const monthNames = [
        'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
        'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
      ];

      const achievementTitle = `Ціль за ${monthNames[month - 1]} ${year} року`;
      let achievement = await this.achievementRepository.findOne({
        where: { title: achievementTitle },
      });

      if (!achievement) {
        achievement = this.achievementRepository.create({
          title: achievementTitle,
          description: `Ви успішно виконали вашу ціль на ${monthNames[month - 1]} ${year} року`,
          type: 'MONTHLY_GOAL',
          threshold: 1,
          icon: 'monthly_goal',
        });

        achievement = await this.achievementRepository.save(achievement);
      }

      // Додаємо досягнення користувачу, якщо він ще його не має
      const existingAchievement = await this.userAchievementRepository.findOne({
        where: {
          user_id: userId,
          achievement_id: achievement.id,
        },
      });

      if (!existingAchievement) {
        await this.userAchievementRepository.save({
          user_id: userId,
          achievement_id: achievement.id,
          is_seen: false,
        });
      }

      // Надсилаємо сповіщення
      await this.notificationRepository.save({
        title: 'Місячну ціль виконано!',
        description: `Вітаємо! Ви успішно виконали свою ціль на ${monthNames[month - 1]}. Ви отримали ${XP_REWARDS.MONTHLY_GOAL_COMPLETED} XP.`,
        user_id: userId,
      });

      return {
        completed: true,
        xpEarned: XP_REWARDS.MONTHLY_GOAL_COMPLETED,
      };
    }

    return {
      completed: false,
      progress: {
        distance: goal.distance_goal > 0 ? Math.min(Math.floor((stats.distance / goal.distance_goal) * 100), 100) : null,
        rides: goal.rides_goal > 0 ? Math.min(Math.floor((stats.rides_count / goal.rides_goal) * 100), 100) : null,
        duration: goal.duration_goal > 0 ? Math.min(Math.floor((stats.duration / goal.duration_goal) * 100), 100) : null,
      },
    };
  }

  // Масова перевірка всіх місячних цілей
  async checkMonthlyGoals() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const goals = await this.monthlyGoalRepository.find({
      where: {
        year,
        month,
        completed: false,
      },
    });

    this.logger.log(`Checking ${goals.length} monthly goals for ${month}/${year}`);

    for (const goal of goals) {
      await this.checkMonthlyGoalForUser(goal.user_id, year, month);
    }

    return { checkedGoals: goals.length };
  }

  // Скидання місячної статистики
  async resetMonthlyStats() {
    const now = new Date();
    const previousMonth = now.getMonth(); // new Date() повертає поточний місяць (0-11)
    const year = previousMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = previousMonth === 0 ? 12 : previousMonth;

    this.logger.log(`Resetting monthly stats for ${month}/${year}`);

    // Архівуємо незавершені цілі попереднього місяця як "неуспішні"
    // Тут можна додати логіку для збереження історії цілей, якщо це потрібно

    // Надсилаємо повідомлення всім користувачам з нагадуванням встановити нову ціль
    const uniqueUsers = await this.userLevelRepository.find();

    for (const user of uniqueUsers) {
      await this.notificationRepository.save({
        title: 'Новий місяць - нові цілі!',
        description: 'Почався новий місяць. Не забудьте встановити цілі на поточний місяць для отримання додаткових XP та досягнень!',
        user_id: user.user_id,
      });
    }

    return { success: true };
  }

  // Встановлення місячної цілі
  async setMonthlyGoal(userId: string, distanceGoal: number, ridesGoal: number, durationGoal: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Перевіряємо чи вже існує ціль на цей місяць
    let goal = await this.monthlyGoalRepository.findOne({
      where: {
        user_id: userId,
        year,
        month,
      },
    });

    if (goal) {
      // Оновлюємо існуючу ціль
      goal.distance_goal = distanceGoal;
      goal.rides_goal = ridesGoal;
      goal.duration_goal = durationGoal;
    } else {
      // Створюємо нову ціль
      goal = this.monthlyGoalRepository.create({
        user_id: userId,
        year,
        month,
        distance_goal: distanceGoal,
        rides_goal: ridesGoal,
        duration_goal: durationGoal,
        completed: false,
      });
    }

    // Зберігаємо ціль
    await this.monthlyGoalRepository.save(goal);

    // Відразу перевіряємо ціль (можливо вона вже виконана)
    const goalStatus = await this.checkMonthlyGoalForUser(userId, year, month);

    return {
      goal,
      status: goalStatus,
    };
  }

  // Отримання місячної цілі
  async getMonthlyGoal(userId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Отримуємо ціль
    const goal = await this.monthlyGoalRepository.findOne({
      where: {
        user_id: userId,
        year,
        month,
      },
    });

    if (!goal) {
      return {
        exists: false,
        message: 'Ви ще не встановили ціль на цей місяць',
      };
    }

    // Отримуємо поточну статистику
    const stats = await this.monthlyStatsRepository.findOne({
      where: {
        user_id: userId,
        year,
        month,
      },
    });

    // Розраховуємо прогрес
    let progress = {
      distance: 0,
      rides: 0,
      duration: 0,
    };

    if (stats) {
      progress = {
        distance: goal.distance_goal > 0 ? Math.min(Math.floor((stats.distance / goal.distance_goal) * 100), 100) : 100,
        rides: goal.rides_goal > 0 ? Math.min(Math.floor((stats.rides_count / goal.rides_goal) * 100), 100) : 100,
        duration: goal.duration_goal > 0 ? Math.min(Math.floor((stats.duration / goal.duration_goal) * 100), 100) : 100,
      };
    }

    // Формування відповіді
    return {
      exists: true,
      goal,
      currentStats: stats || {
        distance: 0,
        rides_count: 0,
        duration: 0,
      },
      progress,
      completed: goal.completed,
    };
  }

  // Отримання історії місячних цілей
  async getMonthlyGoalsHistory(userId: string) {
    // Отримуємо всі цілі користувача
    const goals = await this.monthlyGoalRepository.find({
      where: {
        user_id: userId,
      },
      order: {
        year: 'DESC',
        month: 'DESC',
      },
    });

    // Отримуємо статистику для кожної цілі
    const goalsWithStats = [];

    for (const goal of goals) {
      const stats = await this.monthlyStatsRepository.findOne({
        where: {
          user_id: userId,
          year: goal.year,
          month: goal.month,
        },
      });

      goalsWithStats.push({
        goal,
        stats: stats || {
          distance: 0,
          rides_count: 0,
          duration: 0,
        },
        progress: {
          distance: goal.distance_goal > 0 && stats
            ? Math.min(Math.floor((stats.distance / goal.distance_goal) * 100), 100)
            : 0,
          rides: goal.rides_goal > 0 && stats
            ? Math.min(Math.floor((stats.rides_count / goal.rides_goal) * 100), 100)
            : 0,
          duration: goal.duration_goal > 0 && stats
            ? Math.min(Math.floor((stats.duration / goal.duration_goal) * 100), 100)
            : 0,
        },
      });
    }

    return goalsWithStats;
  }
}
