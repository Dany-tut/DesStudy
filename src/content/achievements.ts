/** Everything the achievement predicates need — computed once per page load from Prisma rows. */
export interface AchievementStats {
  xp: number;
  streak: number;
  lessonsCompleted: number;
  totalLessons: number;
  skills: { skill: string; solved: number; totalTries: number }[];
  firstTryCount: number;
}

import type { GemTone } from '@/components/achievements/CrystalGem';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Which faceted crystal to render for this badge. */
  tone: GemTone;
  check: (s: AchievementStats) => boolean;
}

/** Static badge registry — derived on the fly from existing progress data, no DB table. */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-steps',
    tone: 'sapphire',
    title: 'Первые шаги',
    description: 'Пройди свой первый урок',
    emoji: '👣',
    check: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: 'five-lessons',
    tone: 'sapphire',
    title: 'Пять уроков',
    description: 'Пройди 5 уроков',
    emoji: '📚',
    check: (s) => s.lessonsCompleted >= 5,
  },
  {
    id: 'full-program',
    tone: 'gold',
    title: 'Вся программа',
    description: 'Пройди всю программу целиком',
    emoji: '🏆',
    check: (s) => s.totalLessons > 0 && s.lessonsCompleted >= s.totalLessons,
  },
  {
    id: 'streak-3',
    tone: 'ember',
    title: 'Разогрев',
    description: 'Занимайся 3 дня подряд',
    emoji: '🔥',
    check: (s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    tone: 'ember',
    title: 'Неделя без пропусков',
    description: 'Занимайся 7 дней подряд',
    emoji: '🔥',
    check: (s) => s.streak >= 7,
  },
  {
    id: 'streak-30',
    tone: 'ember',
    title: 'Железная дисциплина',
    description: 'Занимайся 30 дней подряд',
    emoji: '🔥',
    check: (s) => s.streak >= 30,
  },
  {
    id: 'xp-100',
    tone: 'amethyst',
    title: '100 XP',
    description: 'Набери 100 очков опыта',
    emoji: '⚡',
    check: (s) => s.xp >= 100,
  },
  {
    id: 'xp-500',
    tone: 'amethyst',
    title: '500 XP',
    description: 'Набери 500 очков опыта',
    emoji: '⚡',
    check: (s) => s.xp >= 500,
  },
  {
    id: 'xp-1000',
    tone: 'amethyst',
    title: '1000 XP',
    description: 'Набери 1000 очков опыта',
    emoji: '⚡',
    check: (s) => s.xp >= 1000,
  },
  {
    id: 'skill-master',
    tone: 'emerald',
    title: 'Мастер навыка',
    description: 'Держи точность 90%+ в каком-то навыке (от 5 попыток)',
    emoji: '🎯',
    check: (s) => s.skills.some((sk) => sk.totalTries >= 5 && sk.solved / sk.totalTries >= 0.9),
  },
  {
    id: 'first-try-5',
    tone: 'emerald',
    title: 'С первой попытки',
    description: 'Реши 5 заданий с первой попытки',
    emoji: '✨',
    check: (s) => s.firstTryCount >= 5,
  },
];
