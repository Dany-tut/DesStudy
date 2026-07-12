import type { Lesson } from '@/lib/curriculum/types';

/**
 * First lesson — the MVP vertical.
 * Theme: Spacing & the 8pt Grid. Demonstrates the full core loop.
 */
export const spacing8pt: Lesson = {
  id: 'spacing-8pt',
  slug: 'spacing-8pt-grid',
  title: 'Spacing и 8pt-сетка',
  pathTitle: 'UI Foundations',
  skill: 'spacing',
  difficulty: 'intro',
  estimatedMinutes: 8,
  objectives: [
    'Понять, зачем интерфейсам единая сетка отступов',
    'Научиться выбирать значения, кратные 8 (с полушагом 4)',
    'Отличать консистентный ритм от случайных «magic numbers»',
  ],
  prerequisites: [],
  theory: [
    'Профессиональные интерфейсы строятся на **8pt-сетке**: все отступы, паддинги и разрывы кратны 8px (4px — допустимый полушаг для тонкой настройки).',
    'Сетка убирает произвол. Вместо «на глаз 13px или 15px» — предсказуемый ритм: 8, 16, 24, 32. Глаз читает такой интерфейс как аккуратный.',
    'Случайные значения (7px, 13px, 19px) называют **magic numbers** — они ломают консистентность и выдают любителя.',
  ],
  examples: [
    { kind: 'bad', caption: 'Случайные отступы 7 / 13 / 19px — ритма нет', visual: 'spacing-bad' },
    { kind: 'good', caption: 'Отступы 8 / 16 / 24px — чистый ритм 8pt', visual: 'spacing-good' },
  ],
  exercises: [
    {
      id: 'sp-choose-1',
      type: 'choose',
      prompt: 'Какое значение отступа соответствует 8pt-сетке?',
      options: [
        { id: 'a', label: '13px', hint: '13 не кратно 8 и не 4 — это magic number.' },
        { id: 'b', label: '16px' },
        { id: 'c', label: '18px', hint: '18 не кратно 8. Ближайшие валидные: 16 или 24.' },
        { id: 'd', label: '21px', hint: '21 не кратно 8 или 4.' },
      ],
      correctOptionId: 'b',
      explanation:
        '16px = 8 × 2 — идеально ложится на 8pt-сетку. Остальные значения не кратны 8 (и не 4), поэтому ломают ритм.',
    },
    {
      id: 'sp-choose-2',
      type: 'choose',
      prompt:
        'Между заголовком и текстом нужен разрыв чуть меньше 16px. Какое значение выбрать?',
      options: [
        { id: 'a', label: '10px', hint: '10 не на сетке. Полушаг даёт 12px.' },
        { id: 'b', label: '11px', hint: '11 — magic number.' },
        { id: 'c', label: '12px' },
        { id: 'd', label: '14px', hint: '14 не кратно 4. Ближайшие: 12 или 16.' },
      ],
      correctOptionId: 'c',
      explanation:
        '12px = 4 × 3 — это разрешённый полушаг сетки (кратен 4). Когда 16px велико, а 8px мало, 12px — правильный компромисс.',
    },
  ],
  masteryChallenge: {
    id: 'sp-tune-1',
    type: 'tune',
    prompt:
      'Подбери вертикальный отступ секции так, чтобы он лежал на 8pt-сетке и равнялся 24px.',
    unitLabel: 'px',
    min: 0,
    max: 48,
    step: 4,
    correctValue: 24,
    tolerance: 0,
    explanation:
      '24px = 8 × 3 — крупный, «дышащий» отступ для разделения секций. Он кратен 8 и держит вертикальный ритм страницы.',
  },
};

export const lessons: Record<string, Lesson> = {
  [spacing8pt.slug]: spacing8pt,
};
