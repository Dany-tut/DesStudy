/**
 * Translation dictionaries. `ru` is the source of truth; its shape defines the
 * `Dict` type, so `en` is compile-time-checked to cover exactly the same keys.
 *
 * Plurals use a { one, few, many } / { one, other } object (see PluralForms);
 * interpolation uses `{var}` placeholders resolved by t()/tp().
 *
 * Scope note: this covers the app *chrome* (navigation, settings, dashboard,
 * home, learn, achievements, placeholders). Long-form course content in
 * src/content is data, translated separately.
 */

import type { Locale, PluralForms } from './config';
import { exercisesRu, exercisesEn } from './dictionaries/exercises';

export const dictionaries = {
  ru: {
    common: {
      soon: 'скоро',
      inDevelopment: 'В разработке',
      backHome: 'На главную',
      continueLearning: 'Продолжить обучение',
      allLessons: 'Все уроки →',
      min: 'мин',
      days: { one: '{count} дн.', few: '{count} дн.', many: '{count} дн.' } as PluralForms,
    },
    nav: {
      home: 'Главная',
      learn: 'Обучение',
      dashboard: 'Дашборд',
      library: 'Библиотека',
      mentor: 'AI-ментор',
      achievements: 'Достижения',
      designSystem: 'Дизайн-система',
      teacherLessons: 'Уроки',
      teacherResults: 'Результаты',
      settings: 'Настройки',
      profile: 'Профиль',
      signOut: 'Выйти',
      sections: 'Разделы',
      more: 'Ещё',
      close: 'Закрыть',
    },
    settings: {
      title: 'Настройки',
      subtitle: 'Всё применяется сразу и сохраняется на этом устройстве.',
      appearance: 'Оформление',
      themeLabel: 'Тема',
      themeHint: 'Выберите оформление интерфейса.',
      themeLight: 'Светлая',
      themeDark: 'Тёмная',
      languageLabel: 'Язык',
      languageHint: 'Язык интерфейса.',
      accessibility: 'Доступность',
      reduceMotionLabel: 'Приглушённые анимации',
      reduceMotionHint: 'Убирает движение переходов — для чувствительных к анимации.',
      highContrastLabel: 'Высокий контраст',
      highContrastHint: 'Усиливает границы и приглушённый текст.',
    },
    home: {
      welcomeBack: 'С возвращением 👋',
      heroTitle: 'Учись дизайну, делая',
      signIn: 'Войти',
      heroSubtitle:
        'Интерактивная платформа, где ты становишься UI/UX-дизайнером через практику, мгновенную проверку и AI-наставника — а не через часы видео.',
      streak: 'Стрик',
      continueLearning: 'Продолжить обучение',
      paths: 'Пути обучения',
      lessonsCount: { one: '{done}/{total} урок', few: '{done}/{total} урока', many: '{done}/{total} уроков' } as PluralForms,
      lessonsAvailable: {
        one: '{count} урок доступен · остальные в разработке',
        few: '{count} урока доступно · остальные в разработке',
        many: '{count} уроков доступно · остальные в разработке',
      } as PluralForms,
    },
    dashboard: {
      title: 'Дашборд',
      emptySubtitle: 'Пройди первое упражнение, и здесь появится твой прогресс.',
      subtitle: 'Твой измеримый прогресс.',
      xp: 'XP',
      streak: 'Стрик',
      lessonsCompleted: 'Уроков пройдено',
      lessons: 'Уроки',
      noLessons: 'Пока нет активных уроков.',
      weakSkills: 'Слабые навыки',
      strongSkills: 'Сильные навыки',
      recentActivity: 'Недавняя активность',
      allDone: 'Вся программа пройдена — повторить урок',
      continueLearning: 'Продолжить обучение',
      justNow: 'сейчас',
      minsAgo: '{count} мин назад',
      hoursAgo: '{count} ч назад',
      daysAgo: '{count} дн назад',
    },
    learn: {
      title: 'Обучение',
      subtitle: 'Пути от нуля до профессионала — теория, практика, mastery.',
      authoredTitle: 'От преподавателя',
      authoredDescription: 'Уроки, собранные в конструкторе — рядом с основной программой.',
      searchPlaceholder: 'Поиск урока…',
      levelAll: 'Все уровни',
      levelBeginner: 'Начальный',
      levelMedium: 'Средний',
      levelAdvanced: 'Продвинутый',
      statusAll: 'Все',
      statusNew: 'Не начато',
      statusProgress: 'В процессе',
      statusDone: 'Пройдено',
      noMatches: 'Ничего не нашлось — попробуй другой запрос или сними фильтр.',
    },
    lessonCard: {
      popular: 'Популярное',
      lecture: 'Лекция',
      tasks: { one: '{count} задача', few: '{count} задачи', many: '{count} задач' } as PluralForms,
    },
    achievements: {
      title: 'Достижения',
      emptyDescription: 'Пройди первое упражнение, и здесь появятся бейджи за прогресс.',
      unlocked: {
        one: '{done} из {total} бейджей разблокировано.',
        few: '{done} из {total} бейджей разблокировано.',
        many: '{done} из {total} бейджей разблокировано.',
      } as PluralForms,
    },
    mentor: {
      title: 'AI-ментор',
      description:
        'Персональный наставник: разбор ошибок, подсказки, план на день, подготовка к собеседованиям. Уже работает внутри упражнений.',
    },
    library: {
      title: 'Библиотека',
      description:
        'Mobbin-подобная галерея: экраны, потоки, паттерны, дизайн-системы — с поиском по платформе, индустрии и компоненту.',
    },
    exercises: exercisesRu,
  },

  en: {
    common: {
      soon: 'soon',
      inDevelopment: 'In development',
      backHome: 'Back home',
      continueLearning: 'Continue learning',
      allLessons: 'All lessons →',
      min: 'min',
      days: { one: '{count} day', other: '{count} days' } as PluralForms,
    },
    nav: {
      home: 'Home',
      learn: 'Learn',
      dashboard: 'Dashboard',
      library: 'Library',
      mentor: 'AI mentor',
      achievements: 'Achievements',
      designSystem: 'Design system',
      teacherLessons: 'Lessons',
      teacherResults: 'Results',
      settings: 'Settings',
      profile: 'Profile',
      signOut: 'Sign out',
      sections: 'Sections',
      more: 'More',
      close: 'Close',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Everything applies instantly and is saved on this device.',
      appearance: 'Appearance',
      themeLabel: 'Theme',
      themeHint: 'Choose the interface look.',
      themeLight: 'Light',
      themeDark: 'Dark',
      languageLabel: 'Language',
      languageHint: 'Interface language.',
      accessibility: 'Accessibility',
      reduceMotionLabel: 'Reduced motion',
      reduceMotionHint: 'Removes transition movement — for those sensitive to animation.',
      highContrastLabel: 'High contrast',
      highContrastHint: 'Strengthens borders and muted text.',
    },
    home: {
      welcomeBack: 'Welcome back 👋',
      heroTitle: 'Learn design by doing',
      signIn: 'Sign in',
      heroSubtitle:
        'An interactive platform where you become a UI/UX designer through practice, instant feedback, and an AI mentor — not through hours of video.',
      streak: 'Streak',
      continueLearning: 'Continue learning',
      paths: 'Learning paths',
      lessonsCount: { one: '{done}/{total} lesson', other: '{done}/{total} lessons' } as PluralForms,
      lessonsAvailable: {
        one: '{count} lesson available · the rest are in development',
        other: '{count} lessons available · the rest are in development',
      } as PluralForms,
    },
    dashboard: {
      title: 'Dashboard',
      emptySubtitle: 'Complete your first exercise and your progress will show up here.',
      subtitle: 'Your measurable progress.',
      xp: 'XP',
      streak: 'Streak',
      lessonsCompleted: 'Lessons completed',
      lessons: 'Lessons',
      noLessons: 'No active lessons yet.',
      weakSkills: 'Weak skills',
      strongSkills: 'Strong skills',
      recentActivity: 'Recent activity',
      allDone: 'Whole program complete — replay a lesson',
      continueLearning: 'Continue learning',
      justNow: 'just now',
      minsAgo: '{count} min ago',
      hoursAgo: '{count} h ago',
      daysAgo: '{count} d ago',
    },
    learn: {
      title: 'Learn',
      subtitle: 'Paths from zero to pro — theory, practice, mastery.',
      authoredTitle: 'From the instructor',
      authoredDescription: 'Lessons built in the constructor — right beside the core program.',
      searchPlaceholder: 'Search a lesson…',
      levelAll: 'All levels',
      levelBeginner: 'Beginner',
      levelMedium: 'Intermediate',
      levelAdvanced: 'Advanced',
      statusAll: 'All',
      statusNew: 'Not started',
      statusProgress: 'In progress',
      statusDone: 'Completed',
      noMatches: 'Nothing found — try another query or clear the filter.',
    },
    lessonCard: {
      popular: 'Popular',
      lecture: 'Lecture',
      tasks: { one: '{count} task', other: '{count} tasks' } as PluralForms,
    },
    achievements: {
      title: 'Achievements',
      emptyDescription: 'Complete your first exercise and progress badges will show up here.',
      unlocked: {
        one: '{done} of {total} badge unlocked.',
        other: '{done} of {total} badges unlocked.',
      } as PluralForms,
    },
    mentor: {
      title: 'AI mentor',
      description:
        'A personal mentor: mistake breakdowns, hints, a plan for the day, interview prep. Already working inside exercises.',
    },
    library: {
      title: 'Library',
      description:
        'A Mobbin-style gallery: screens, flows, patterns, design systems — searchable by platform, industry, and component.',
    },
    exercises: exercisesEn,
  },
} as const;

/** The dictionary shape, derived from the Russian source of truth. */
export type Dict = (typeof dictionaries)['ru'];

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale] as Dict;
}
