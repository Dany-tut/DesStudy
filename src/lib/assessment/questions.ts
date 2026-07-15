/**
 * The 25 questions of the entry grading test, transcribed from the FormFactor
 * "тест на грейд". Each question maps 1:1 to a skill in taxonomy.ts; the four
 * options are ordered by level 1..4 (awareness → leadership).
 *
 * Presentation is chosen per question so the test reads as an interactive walk
 * on the design system, not a radio list:
 *   - 'segmented'  — short 4-way pick, DS SegmentedControl
 *   - 'choice'     — long, sentence-length options, DS ChoiceCard column
 * A few UI/UX skills instead carry an `interactive` id: the learner completes a
 * real mini-task (graded objectively) which proposes the level, with the option
 * to fall back to self-assessment. See QuestionStep.tsx.
 */

import type { Category, SkillLevel } from './taxonomy';

export type QuestionPresentation = 'segmented' | 'choice';

/** Ids of the real interactive mini-tasks (objective grading). */
export type Interaction = 'color-contrast' | 'component-states';

export interface Option {
  /** the level this answer corresponds to */
  level: SkillLevel;
  label: string;
}

export interface Question {
  order: number; // 1..25
  skillId: string;
  category: Category;
  /** question stem shown as the step title */
  prompt: string;
  present: QuestionPresentation;
  /** when set, the step renders an interactive mini-task before the options */
  interactive?: Interaction;
  /**
   * When true, several options can be picked at once (independent skills, not a
   * single progressive ladder). The resolved level is the highest picked — the
   * hardest thing you can do defines your level. Multi questions never
   * auto-advance; the learner confirms with a "Далее".
   */
  multi?: boolean;
  options: [Option, Option, Option, Option];
}

const o = (level: SkillLevel, label: string): Option => ({ level, label });

export const QUESTIONS: Question[] = [
  {
    order: 1,
    skillId: 'client-approval',
    category: 'ui',
    prompt: 'Вы получаете много правок по визуалу?',
    present: 'choice',
    options: [
      o(1, 'Заказчикам редко нравится, часто переделываю'),
      o(2, 'Заказчикам ок, от старших дизайнеров прилетают правки'),
      o(3, 'Заказчикам нравится, от дизайнеров бывает немного правок'),
      o(4, 'Заказчикам и дизайнерам всё нравится, правок почти нет'),
    ],
  },
  {
    order: 2,
    skillId: 'layout',
    category: 'ui',
    prompt: 'Как работаете с пропорциями в типографике и верстке?',
    present: 'choice',
    options: [
      o(1, 'Интуитивно'),
      o(2, 'Беру готовые линейки размеров текста и отступов'),
      o(
        3,
        'Умею строить линейки сам, верстать плотно и воздушно, знаю оптическую и метрическую линейку, использую компенсации',
      ),
      o(4, 'Мои сетки, размеры текста и отступов связаны пропорциональной системой'),
    ],
  },
  {
    order: 3,
    skillId: 'composition',
    category: 'ui',
    prompt: 'Как строите композицию?',
    present: 'choice',
    options: [
      o(1, 'Интуитивно'),
      o(2, 'Копирую и адаптирую с референсов'),
      o(3, 'По принципу прямоугольника. Знаю схемы швейцарской верстки'),
      o(4, 'Использую пятно, ритм и метр. Нет проблем с версткой десктопа, могу верстать любые форматы'),
    ],
  },
  {
    order: 4,
    skillId: 'color',
    category: 'ui',
    prompt: 'Как работаете с палитрой?',
    present: 'choice',
    interactive: 'color-contrast',
    options: [
      o(1, 'Неуверенно чувствую себя в этой теме'),
      o(2, 'Работаю только с готовыми палитрами'),
      o(3, 'Могу создать палитру сам через плагин, соблюдаю WCAG / APCA'),
      o(4, 'Тёмная тема, ч/б, жёлтые, кислотные, многоакцентные палитры, токенизация'),
    ],
  },
  {
    order: 5,
    skillId: 'figma',
    category: 'ui',
    prompt: 'Уровень владения Figma',
    present: 'choice',
    options: [
      o(1, 'Фреймы, группы, стили'),
      o(2, 'Автолейауты, компоненты, варианты, плагины'),
      o(3, 'Токены цветов и текста'),
      o(4, 'Прототипы на токенах, шарю за перформанс'),
    ],
  },
  {
    order: 6,
    skillId: 'ds',
    category: 'ui',
    prompt: 'Опыт с дизайн-системой',
    present: 'choice',
    options: [
      o(1, 'Нет опыта'),
      o(2, 'Проектирование простых компонентов (поле ввода, табы) на автолейауте, вариантах'),
      o(3, 'Сложные компоненты (мультиселект)'),
      o(4, 'Составные компоненты на токенах, доступность, перформанс'),
    ],
  },
  {
    order: 7,
    skillId: 'style',
    category: 'ui',
    prompt: 'Можете придумать стилистику с нуля?',
    present: 'choice',
    options: [
      o(1, 'Копирую референсы, много расплывчатых правок от заказчика'),
      o(2, 'Могу соединять идеи из нескольких рефов'),
      o(3, 'Могу рисовать в стиле любого приложения, делать энергичнее, спокойнее'),
      o(4, 'Делаю концепции с нуля. Придумываю графическую идею и выражаю её через типографику, верстку и цвет'),
    ],
  },
  {
    order: 8,
    skillId: 'scenarios',
    category: 'ux',
    prompt: 'Какой у вас опыт проектирования?',
    present: 'choice',
    options: [
      o(1, 'Нет опыта'),
      o(2, 'Линейные сценарии до 10 экранов'),
      o(3, 'Сценарии с логическими развилками 10–30 экранов'),
      o(4, 'Задачи с зависимостями, когда у одного экрана может быть 30+ состояний'),
    ],
  },
  {
    order: 9,
    skillId: 'ux-writing',
    category: 'ux',
    prompt: 'Редактура и UX-копирайтинг',
    present: 'choice',
    options: [
      o(1, 'Ставлю текст-заглушку, дальше отдаю райтеру'),
      o(2, 'Пишу простые вещи, редактор правит'),
      o(3, 'Почти все тексты принимают без правок'),
      o(4, 'Прочитал Мильчина. Делаю ревью текстов'),
    ],
  },
  {
    order: 10,
    skillId: 'responsive',
    category: 'ux',
    prompt: 'Опыт с адаптивами',
    present: 'segmented',
    options: [
      o(1, 'Только мобилки'),
      o(2, 'Десктоп и планшеты'),
      o(3, 'Приложения на Flutter и ultrawide-мониторы'),
      o(4, 'Нативные приложения'),
    ],
  },
  {
    order: 11,
    skillId: 'states',
    category: 'ux',
    prompt: 'Состояния и передача в разработку',
    present: 'choice',
    interactive: 'component-states',
    options: [
      o(1, 'Делаю ховеры при наведении'),
      o(2, 'Знаю 6 состояний компонентов, 5 состояний экрана'),
      o(3, 'Наведение, фокусировки, клавиатурные режимы, тексты ошибок'),
      o(4, 'Опыт с локализацией, апскейлингом, доступностью'),
    ],
  },
  {
    order: 12,
    skillId: 'confidence',
    category: 'product',
    prompt: 'Насколько вы самостоятельны как дизайнер?',
    present: 'choice',
    options: [
      o(1, 'Меня курирует старший дизайнер, проверяет всё, что я делаю'),
      o(2, 'Делаю задачи сам, предлагаю идеи, но их редко принимают'),
      o(3, 'Работаю в паре с продактом, на равных. Мои решения принимают с небольшими комментариями'),
      o(4, 'Могу заменить продакта на проекте'),
    ],
  },
  {
    order: 13,
    skillId: 'tasks',
    category: 'product',
    prompt: 'Какие задачи доверяют на работе?',
    present: 'choice',
    options: [
      o(1, 'Ещё учусь'),
      o(2, 'Делаю то, что скажут, в основном небольшие задачи'),
      o(3, 'Абстрактные задачи: сам выясняю и уточняю, что нужно сделать'),
      o(4, 'R&D задачи: найти точку роста продукта'),
    ],
  },
  {
    order: 14,
    skillId: 'metrics',
    category: 'product',
    prompt: 'Как вы работаете с данными?',
    present: 'choice',
    options: [
      o(1, 'Не работаю, всё по интуиции'),
      o(2, 'Запрашиваю метрики под свои задачи'),
      o(3, 'Принимаю решения на данных. Могу сравнить гипотезы по потенциалу в метриках'),
      o(4, 'Сам смотрю отчёты, ищу инсайты и строю гипотезы. Отслеживаю результаты после запуска и исправляю проблемы'),
    ],
  },
  {
    order: 15,
    skillId: 'hypotheses',
    category: 'product',
    prompt: 'Как вы генерируете гипотезы?',
    present: 'choice',
    options: [
      o(1, 'Рисую то, что мне скажут'),
      o(2, 'Предлагаю решения, которые видел у конкурентов'),
      o(3, 'Знаю в теории, как влиять на поведение людей, повышать конверсию'),
      o(4, 'Большой опыт A/B тестов своих решений, знаю принципы повышения конверсии дизайном и их ограничения'),
    ],
  },
  {
    order: 16,
    skillId: 'audience',
    category: 'product',
    prompt: 'Как вы анализируете аудиторию?',
    present: 'choice',
    options: [
      o(1, 'Не знаю как'),
      o(2, 'Использую user story или job story'),
      o(3, 'Проводил JTBD-интервью, делал сегментацию'),
      o(4, 'Всё что выше + знаю принципы сегментации в маркетинге и продажах'),
    ],
  },
  {
    order: 17,
    skillId: 'interviews',
    category: 'product',
    prompt: 'Организовывали и проводили глубинные интервью: рекрутинг ЦА, задачи юзера, скрипт?',
    present: 'segmented',
    options: [
      o(1, 'Нет опыта'),
      o(2, 'Учебный опыт'),
      o(3, 'Реальный опыт'),
      o(4, 'Много опыта на реальном проекте'),
    ],
  },
  {
    order: 18,
    skillId: 'ux-tests',
    category: 'product',
    prompt: 'Проводили UX / user / first-click тесты?',
    present: 'segmented',
    options: [
      o(1, 'Нет опыта'),
      o(2, 'Учебный опыт'),
      o(3, 'Реальный опыт'),
      o(4, 'Много опыта на реальном проекте'),
    ],
  },
  {
    order: 19,
    skillId: 'more-research',
    category: 'product',
    prompt: 'Какие ещё виды исследований умеете? Отметьте всё, что делали',
    present: 'choice',
    multi: true,
    options: [
      o(1, 'Больше ничего'),
      o(2, 'Коридорки, карточные сортировки'),
      o(3, 'Опросы, A/B тесты'),
      o(4, 'Полевые, дневниковые'),
    ],
  },
  {
    order: 20,
    skillId: 'cases',
    category: 'career',
    prompt: 'Какие кейсы/работы есть у вас в портфолио?',
    present: 'choice',
    options: [
      o(1, 'Нет кейсов, только несколько учебных экранов'),
      o(2, 'Небольшие проекты без исследований ссылками в Figma или на Behance'),
      o(3, 'Продуктовые кейсы с исследованиями / сложные проекты 40+ экранов / кейсы с очень крутым визуалом'),
      o(4, 'Продуктовые кейсы с влиянием на метрики, кейсы из бигтеха'),
    ],
  },
  {
    order: 21,
    skillId: 'responses',
    category: 'career',
    prompt: 'Как у вас с откликами?',
    present: 'choice',
    options: [
      o(1, 'Не пробовал / 100% отказов'),
      o(2, 'На сотню откликов всего пара приглашений / тестовых'),
      o(3, 'Из 100 откликов 10–15 приглашений / тестовых'),
      o(4, 'Не откликаюсь, мне пишут сами'),
    ],
  },
  {
    order: 22,
    skillId: 'interviews-job',
    category: 'career',
    prompt: 'Как у вас с собеседованиями?',
    present: 'choice',
    options: [
      o(1, '100% отказов'),
      o(2, 'В 1–2 из 10 случаев прохожу на следующий этап'),
      o(3, 'В 6 из 10 случаев прохожу на следующий этап'),
      o(4, 'Без проблем прохожу собесы на 200к+'),
    ],
  },
  {
    order: 23,
    skillId: 'test-tasks',
    category: 'career',
    prompt: 'Как дела с тестовыми заданиями?',
    present: 'choice',
    options: [
      o(1, '100% отказов'),
      o(2, 'В 1–2 из 10 случаев прохожу на следующий этап'),
      o(3, 'В 6 из 10 случаев прохожу на следующий этап'),
      o(4, 'Без проблем решаю тестовые и вайтборды на 200к+'),
    ],
  },
  {
    order: 24,
    skillId: 'specialization',
    category: 'career',
    prompt: 'У вас есть специализация?',
    present: 'choice',
    options: [
      o(1, 'Нет'),
      o(2, 'Умею и внутренние, и публичные продукты'),
      o(3, 'Отраслевая специализация от 2 лет: финтех / крипта / екоммерс и т.д.'),
      o(4, 'Продуктовая + отраслевая специализация + опыт в бигтехе'),
    ],
  },
  {
    order: 25,
    skillId: 'experience',
    category: 'career',
    prompt: 'Опыт в дизайне интерфейсов',
    present: 'choice',
    options: [
      o(1, 'Учебный опыт'),
      o(2, 'Опыт работы с заказчиком (фриланс, агентство)'),
      o(3, 'Работа в продуктовой команде'),
      o(4, 'Работа в бигтехе / госкомпании / известном сервисе'),
    ],
  },
];

if (QUESTIONS.length !== 25) {
  throw new Error(`Assessment must have 25 questions, got ${QUESTIONS.length}`);
}

export const QUESTION_BY_SKILL: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.skillId, q]),
);

/**
 * The descriptor of a given level for a skill — i.e. the answer option text at
 * that level. This is what the FormFactor "grade card" spells out per cell; we
 * already carry it as the option label, so the result screen reuses it as
 * "what your level means" without a duplicated descriptor table.
 */
export function levelDescriptor(skillId: string, level: number): string | undefined {
  return QUESTION_BY_SKILL[skillId]?.options[level - 1]?.label;
}

/** The next level up (the growth target), or undefined at the ceiling. */
export function nextLevelDescriptor(skillId: string, level: number): string | undefined {
  if (level >= 4) return undefined;
  return QUESTION_BY_SKILL[skillId]?.options[level]?.label;
}
