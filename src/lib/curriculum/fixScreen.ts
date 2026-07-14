/**
 * Shared, React-free spec for the `fix-screen` exercise. Both the deterministic
 * validator and the interactive component render from this single source, so
 * every defect maps to exactly one correct option. The mockup visuals (icons,
 * layout) live in the component; only the data lives here.
 */

export type DefectKey = 'radius' | 'chevron' | 'navActive' | 'pillColor' | 'gap' | 'cta';

export interface FixOption {
  id: string;
  label: string;
  correct?: boolean;
  /** Shown when this wrong option is picked — gentle, specific nudge. */
  feedback?: string;
}

export interface FixDefect {
  key: DefectKey;
  title: string;
  hint: string;
  options: FixOption[];
}

export const FIX_DEFECTS: FixDefect[] = [
  {
    key: 'radius',
    title: 'Скругление карточек и полей',
    hint: 'Углы почти прямые — макет выглядит резко и дёшево.',
    options: [
      { id: 'sm', label: 'rounded-sm · 4px' },
      { id: 'md', label: 'rounded-lg · 8px', feedback: 'Уже лучше, но в этом макете карточки заметно круглее.' },
      { id: 'full', label: 'rounded-full · пилюля', feedback: 'Поля превращаются в пилюли — перебор, форма спорит с содержимым.' },
      { id: 'xl', label: 'rounded-2xl · 16px', correct: true },
    ],
  },
  {
    key: 'chevron',
    title: 'Иконка в дропдауне',
    hint: 'Стоит стрелка «вправо» — она читается как переход, а не как раскрытие списка.',
    options: [
      { id: 'right', label: 'ChevronRight  ›' },
      { id: 'up', label: 'ChevronUp  ⌃', feedback: '«Вверх» намекает, что список уже раскрыт вверх — для закрытого поля сбивает.' },
      { id: 'plus', label: 'Plus  +', feedback: '«Плюс» читается как «добавить», а не «раскрыть список».' },
      { id: 'down', label: 'ChevronDown  ⌄', correct: true },
    ],
  },
  {
    key: 'navActive',
    title: 'Активный таб в нав-баре',
    hint: 'Ни один пункт не выделен — непонятно, где ты находишься.',
    options: [
      { id: 'none', label: 'Без выделения' },
      { id: 'all', label: 'Подсветить все', feedback: 'Тогда «активно» всё сразу — сигнал теряется.' },
      { id: 'chat', label: 'Выделить Chat', feedback: 'Подсвечен не тот раздел — пользователь на главной, а не в чате.' },
      { id: 'home', label: 'Выделить Home', correct: true },
    ],
  },
  {
    key: 'pillColor',
    title: 'Цвет чипов категорий',
    hint: 'Чипы залиты произвольным серым вместо токена бренда.',
    options: [
      { id: 'gray', label: 'Случайный #9AA0A6' },
      { id: 'rainbow', label: 'Каждый чип — свой цвет', feedback: 'Разнобой цветов шумит и ломает систему — нужен один токен бренда.' },
      { id: 'red', label: 'Все акцентно-красным', feedback: 'Один агрессивный цвет на всё кричит и путается со статусами ошибок.' },
      { id: 'brand', label: 'bg-brand / токен', correct: true },
    ],
  },
  {
    key: 'gap',
    title: 'Отступы между блоками',
    hint: 'Поля слиплись — нет единого ритма вертикали (auto-layout gap).',
    options: [
      { id: 'tight', label: 'gap 4px, слипшийся' },
      { id: 'zero', label: 'gap 0 — вплотную', feedback: 'Совсем без отступов — блоки сливаются в кашу.' },
      { id: 'loose', label: 'gap 32px, разреженный', feedback: 'Слишком много воздуха — блоки распадаются, группировка теряется.' },
      { id: 'even', label: 'gap 16px, единый', correct: true },
    ],
  },
  {
    key: 'cta',
    title: 'Главная кнопка',
    hint: 'Кнопка узкая и прижата влево — не выглядит как основное действие.',
    options: [
      { id: 'inline', label: 'По контенту, слева' },
      { id: 'right', label: 'По контенту, справа', feedback: 'Справа основное действие теряется — взгляд идёт слева направо.' },
      { id: 'center', label: 'Узкая, по центру', feedback: 'По центру и узкая читается как второстепенная, а не как главное действие.' },
      { id: 'full', label: 'Full-width, снизу', correct: true },
    ],
  },
];

/** The learner's per-defect selection. */
export type FixScreenAnswer = Record<DefectKey, string>;

/** Starting (broken) selection — the first, wrong option of each defect. */
export const FIX_INITIAL: FixScreenAnswer = FIX_DEFECTS.reduce(
  (acc, d) => ({ ...acc, [d.key]: d.options[0].id }),
  {} as FixScreenAnswer,
);

/** How many defects are currently fixed with their correct option. */
export function fixSolvedCount(answer: Partial<FixScreenAnswer> | null | undefined): number {
  if (!answer) return 0;
  return FIX_DEFECTS.filter((d) => d.options.find((o) => o.id === answer[d.key])?.correct).length;
}
