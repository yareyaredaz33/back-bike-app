import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AchievementEntity, UserAchievementEntity } from '../DB/Entities/achivement.entity';
import { RideEntity } from '../DB/Entities/ride.entity';
import { UserEntityRide } from '../DB/Entities/user.entity.ride';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(AchievementEntity)
    private achievementRepository: Repository<AchievementEntity>,
    @InjectRepository(UserAchievementEntity)
    private userAchievementRepository: Repository<UserAchievementEntity>,
    @InjectRepository(RideEntity)
    private rideRepository: Repository<RideEntity>,
    @InjectRepository(UserEntityRide)
    private userRideRepository: Repository<UserEntityRide>,
  ) {}

  async initializeAchievements() {
    // Check if achievements already exist
    const count = await this.achievementRepository.count();
    if (count > 0) return;

    // Create default achievements
    const defaultAchievements = [
      {
        title: 'Перша поїздка',
        description: 'Ви успішно здійснили свою першу поїздку!',
        type: 'RIDE_COUNT',
        threshold: 1,
        icon: 'https://www.svgrepo.com/show/35275/number-one.svg',
      },
      {
        title: 'Десять поїздок',
        description: 'Ви успішно здійснили десять поїздок!',
        type: 'RIDE_COUNT',
        threshold: 10,
        icon: 'https://media.gettyimages.com/id/1459004414/vector/x10-ten-times-icon-with-reflection-on-white-background.jpg?s=1024x1024&w=gi&k=20&c=hIBjoz1ddCMpx3IJTjiYmM8YRoMtIJtxE_rjHTxvw6U=',
      },
      {
        title: '10 км',
        description: 'Ви проїхали 10 кілометрів!',
        type: 'DISTANCE',
        threshold: 10000, // 10 km in meters
        icon: 'https://www.iconpacks.net/icons/4/free-number-ten-icon-13274-thumb.png',
      },
      {
        title: '100 км',
        description: 'Ви проїхали 100 кілометрів!',
        type: 'DISTANCE',
        threshold: 100000, // 100 km in meters
        icon: 'https://www.freeiconspng.com/uploads/poker-chip-100-icon-27.png',
      },
      {
        title: '500 км',
        description: 'Ви проїхали 500 кілометрів!',
        type: 'DISTANCE',
        threshold: 500000, // 500 km in meters
        icon: 'https://cdn-icons-png.flaticon.com/512/28/28287.png',
      },
      {
        title: '10000 км',
        description: 'Ви проїхали 10000 кілометрів!',
        type: 'DISTANCE',
        threshold: 10000000, // 500 km in meters
        icon: 'https://img.freepik.com/premium-vector/smart-watch-showing-10000-steps-icon-simple-style_98396-143488.jpg?w=360',
      },
      {
        title: 'Марафонець',
        description: 'Ви проїхали більше 10 годин!',
        type: 'DURATION',
        threshold: 600 * 60, // 10 hours in minutes
        icon: 'https://media.istockphoto.com/id/1073746226/vector/runner-icon.jpg?s=612x612&w=0&k=20&c=55aJZ6lK8NzY1V6wjuSRLOdVOK3tdnQyIXWz60k_vhY=',
      },
    ];

    await this.achievementRepository.save(defaultAchievements);
  }

  async checkUserAchievements(userId: string) {
    // Get all achievements
    const allAchievements = await this.achievementRepository.find();

    // Get already unlocked achievements for this user
    const unlockedAchievements = await this.userAchievementRepository.find({
      where: { user_id: userId },
    });
    const unlockedIds = unlockedAchievements.map(ua => ua.achievement_id);

    // Calculate user stats
    const userStats = await this.calculateUserStats(userId);

    // Check each achievement that hasn't been unlocked yet
    const newAchievements = [];

    for (const achievement of allAchievements) {
      if (unlockedIds.includes(achievement.id)) continue;

      let isUnlocked = false;

      switch (achievement.type) {
        case 'RIDE_COUNT':
          isUnlocked = userStats.rideCount >= achievement.threshold;
          break;
        case 'DISTANCE':
          isUnlocked = userStats.totalDistance >= achievement.threshold;
          break;
        case 'DURATION':
          isUnlocked = userStats.totalDuration >= achievement.threshold;
          break;
      }

      if (isUnlocked) {
        // Unlock the achievement
        const userAchievement = this.userAchievementRepository.create({
          user_id: userId,
          achievement_id: achievement.id,
          is_seen: false,
        });

        await this.userAchievementRepository.save(userAchievement);
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  async calculateUserStats(userId: string) {
    // Get all rides created by the user
    const ownRides = await this.rideRepository.find({
      where: { user_id: userId },
    });

    // Get all rides the user participated in
    const participatedRideIds = await this.userRideRepository.find({
      where: { user_id: userId },
    });
    const rideIds = participatedRideIds.map(r => r.ride_id);
    const participatedRides = await this.rideRepository.find({
      where: {
        id: In(rideIds)
      },
    });

    // Combine both sets of rides
    const allRides = [...ownRides, ...participatedRides];

    // Calculate stats
    return {
      rideCount: allRides.length,
      totalDistance: allRides.reduce((sum, ride) => sum + (ride.distance || 0), 0),
      totalDuration: allRides.reduce((sum, ride) => sum + (ride.duration || 0), 0),
    };
  }

  async getUserAchievements(userId: string) {
    // Get all user achievements
    const userAchievements = await this.userAchievementRepository.find({
      where: { user_id: userId },
    });

    if (!userAchievements.length) return [];

    // Get achievement details
    const achievementIds = userAchievements.map(ua => ua.achievement_id);
    const achievements = await this.achievementRepository.find({
      // @ts-ignore
      where: { id: In(achievementIds) },
    });

    // Merge data
    return achievements.map((achievement) => {
      const userAchievement = userAchievements.find(
        (ua) => ua.achievement_id === achievement.id,
      );

      return {
        ...achievement,
        unlocked_at: userAchievement.unlocked_at,
        is_seen: userAchievement.is_seen,
      };
    });
  }

  async markAchievementsAsSeen(userId: string) {
    await this.userAchievementRepository.update(
      { user_id: userId, is_seen: false },
      { is_seen: true }
    );

    return { success: true };
  }
}
