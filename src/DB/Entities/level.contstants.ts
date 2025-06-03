export enum UserLevelTitle {
  BEGINNER = 'Новачок',
  APPRENTICE = 'Учень',
  PROFESSIONAL = 'Профі',
  MASTER = 'Майстер',
  LEGEND = 'Легенда',
}

// Мапа рівнів
export const LEVEL_TITLES: Record<number, string> = {
  1: UserLevelTitle.BEGINNER,
  2: UserLevelTitle.BEGINNER,
  3: UserLevelTitle.APPRENTICE,
  4: UserLevelTitle.APPRENTICE,
  5: UserLevelTitle.PROFESSIONAL,
  6: UserLevelTitle.PROFESSIONAL,
  7: UserLevelTitle.MASTER,
  8: UserLevelTitle.MASTER,
  9: UserLevelTitle.LEGEND,
  10: UserLevelTitle.LEGEND,
};

// Необхідний XP для кожного рівня
export const XP_REQUIREMENTS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 1000,
  6: 2000,
  7: 3500,
  8: 5000,
  9: 7500,
  10: 10000,
};

// Максимальний рівень
export const MAX_LEVEL = 10;

// Нагорода XP за різні дії
export const XP_REWARDS = {
  RIDE_COMPLETE: 25,          // XP за кожну завершену поїздку
  KM_TRAVELED: 0.5,           // XP за кожен км (буде помножено на кількість км)
  MINUTE_DURATION: 0.3,       // XP за кожну хвилину поїздки
  ACHIEVEMENT_UNLOCKED: 50,   // XP за кожне розблоковане досягнення
  MONTHLY_GOAL_COMPLETED: 100 // XP за виконання місячної цілі
};
