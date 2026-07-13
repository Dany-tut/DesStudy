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
      id: 'r-tune-1',
      type: 'tune',
      prompt: 'Потяни за угол карточки и поставь радиус на узел шкалы `radius.lg`.',
      unitLabel: 'px',
      min: 0,
      max: 28,
      step: 2,
      correctValue: 14,
      tolerance: 0,
      visual: 'radius',
      explanation:
        '14px — узловое значение шкалы (`radius.lg`). Маркер примагничивается к шкале сам, поэтому промежуточные значения вроде 11 или 17 на ней не задержатся.',
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
