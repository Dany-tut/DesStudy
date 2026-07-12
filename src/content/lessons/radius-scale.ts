import type { Lesson } from '@/lib/curriculum/types';

/** UI Foundations — corner radius scale. */
export const radiusScale: Lesson = {
  id: 'radius-scale',
  slug: 'radius-scale',
  title: 'Скругления и шкала радиусов',
  pathTitle: 'UI Foundations',
  skill: 'radius',
  difficulty: 'easy',
  estimatedMinutes: 7,
  objectives: [
    'Понять, зачем интерфейсу единая шкала скруглений',
    'Научиться выбирать радиус из шкалы, а не «на глаз»',
    'Согласовывать радиусы вложенных элементов',
  ],
  prerequisites: ['spacing-8pt-grid'],
  theory: [
    'Скругления, как и отступы, живут по **шкале**: например `6 · 10 · 14 · 20 · full`. Случайные значения (3, 11, 19) ломают консистентность.',
    'Правило вложенности: у внутреннего элемента радиус **меньше**, чем у контейнера — иначе углы «плывут». Часто `внутренний = внешний − отступ`.',
    'Мелкие элементы (чипы, инпуты) — маленький радиус; крупные карточки — средний; аватары и пилюли — `full`.',
  ],
  examples: [
    { kind: 'bad', caption: 'Случайные радиусы 3/11/19 — разнобой', visual: 'radius-bad' },
    { kind: 'good', caption: 'Радиусы 6/10/14 по шкале — согласованно', visual: 'radius-good' },
  ],
  exercises: [
    {
      id: 'r-choose-1',
      type: 'choose',
      prompt: 'Какой радиус принадлежит шкале 6 · 10 · 14 · 20?',
      options: [
        { id: 'a', label: '11px', hint: '11 нет в шкале — это magic number.' },
        { id: 'b', label: '14px' },
        { id: 'c', label: '17px', hint: '17 вне шкалы. Ближайшие: 14 или 20.' },
        { id: 'd', label: '5px', hint: '5 вне шкалы. Ближайший — 6.' },
      ],
      correctOptionId: 'b',
      explanation:
        '14px — узловое значение шкалы (шаг lg). Остальные не принадлежат шкале и создают визуальный разнобой.',
    },
    {
      id: 'r-choose-2',
      type: 'choose',
      prompt:
        'Карточка со скруглением 16px, внутри неё — кнопка с полем 8px. Какой радиус кнопки согласован?',
      options: [
        { id: 'a', label: '16px', hint: 'Равный радиус: углы кнопки «упрутся» в углы карточки.' },
        { id: 'b', label: '8px' },
        { id: 'c', label: '20px', hint: 'Внутренний радиус не должен быть больше внешнего.' },
        { id: 'd', label: '2px', hint: 'Слишком мелкий — выглядит почти прямым.' },
      ],
      correctOptionId: 'b',
      explanation:
        'Правило вложенности: внутренний радиус = внешний − отступ = 16 − 8 = 8px. Тогда концентричные углы выглядят аккуратно.',
    },
  ],
  masteryChallenge: {
    id: 'r-choose-3',
    type: 'choose',
    prompt: 'Что выбрать для аватара пользователя?',
    options: [
      { id: 'a', label: 'radius 6', hint: 'Мелкий радиус — для чипов и инпутов.' },
      { id: 'b', label: 'radius 14', hint: 'Средний — для карточек.' },
      { id: 'c', label: 'radius full', },
      { id: 'd', label: 'radius 0', hint: 'Острые углы для аватара смотрятся жёстко.' },
    ],
    correctOptionId: 'c',
    explanation:
      'Аватары и «пилюли» используют `full` (9999px) — идеальная окружность вне зависимости от размера.',
  },
};
