/** Everything the achievement predicates need — computed once per page load from Prisma rows. */
export interface AchievementStats {
  xp: number;
  streak: number;
  lessonsCompleted: number;
  totalLessons: number;
  skills: { skill: string; solved: number; totalTries: number }[];
  firstTryCount: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (s: AchievementStats) => boolean;
}

/** Static badge registry — derived on the fly from existing progress data, no DB table. */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-steps',
    title: 'Первые шаги',
    description: 'Пройди свой первый урок',
    emoji: '👣',
    check: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: 'five-lessons',
    title: 'Пять уроков',
    description: 'Пройди 5 уроков',
    emoji: '📚',
    check: (s) => s.lessonsCompleted >= 5,
  },
  {
    id: 'full-program',
    title: 'Вся программа',
    description: 'Пройди всю программу целиком',
    emoji: '🏆',
    check: (s) => s.totalLessons > 0 && s.lessonsCompleted >= s.totalLessons,
  },
  {
    id: 'streak-3',
    title: 'Разогрев',
    description: 'Занимайся 3 дня подряд',
    emoji: '🔥',
    check: (s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    title: 'Неделя без пропусков',
    description: 'Занимайся 7 дней подряд',
    emoji: '🔥',
    check: (s) => s.streak >= 7,
  },
  {
    id: 'streak-30',
    title: 'Железная дисциплина',
    description: 'Занимайся 30 дней подряд',
    emoji: '🔥',
    check: (s) => s.streak >= 30,
  },
  {
    id: 'xp-100',
    title: '100 XP',
    description: 'Набери 100 очков опыта',
    emoji: '⚡',
    check: (s) => s.xp >= 100,
  },
  {
    id: 'xp-500',
    title: '500 XP',
    description: 'Набери 500 очков опыта',
    emoji: '⚡',
    check: (s) => s.xp >= 500,
  },
  {
    id: 'xp-1000',
    title: '1000 XP',
    description: 'Набери 1000 очков опыта',
    emoji: '⚡',
    check: (s) => s.xp >= 1000,
  },
  {
    id: 'skill-master',
    title: 'Мастер навыка',
    description: 'Держи точность 90%+ в каком-то навыке (от 5 попыток)',
    emoji: '🎯',
    check: (s) => s.skills.some((sk) => sk.totalTries >= 5 && sk.solved / sk.totalTries >= 0.9),
  },
  {
    id: 'first-try-5',
    title: 'С первой попытки',
    description: 'Реши 5 заданий с первой попытки',
    emoji: '✨',
    check: (s) => s.firstTryCount >= 5,
  },
];
