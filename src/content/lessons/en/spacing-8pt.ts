import type { Lesson } from '@/lib/curriculum/types';

/**
 * First lesson — the MVP vertical.
 * Theme: Spacing & the 8pt Grid. Demonstrates the full core loop.
 */
export const spacing8ptEn: Lesson = {
  id: 'spacing-8pt',
  slug: 'spacing-8pt-grid',
  title: 'Spacing and the 8pt grid',
  pathTitle: 'UI Foundations',
  skill: 'spacing',
  difficulty: 'intro',
  estimatedMinutes: 8,
  objectives: [
    'Understand why interfaces need a single spacing grid',
    'Learn to pick values that are multiples of 8 (with a 4 half-step)',
    'Tell a consistent rhythm apart from random "magic numbers"',
  ],
  prerequisites: [],
  theory: [
    'Professional interfaces are built on an **8pt grid**: every margin, padding, and gap is a multiple of 8px (4px is an acceptable half-step for fine-tuning).',
    'The grid removes guesswork. Instead of "eyeballing 13px or 15px" you get a predictable rhythm: 8, 16, 24, 32. The eye reads an interface like this as tidy.',
    'Random values (7px, 13px, 19px) are called **magic numbers** — they break consistency and give away an amateur.',
  ],
  examples: [
    { kind: 'bad', caption: 'Random spacing 7 / 13 / 19px — no rhythm', visual: 'spacing-bad' },
    { kind: 'good', caption: 'Spacing 8 / 16 / 24px — clean 8pt rhythm', visual: 'spacing-good' },
  ],
  exercises: [
    {
      id: 'sp-choose-1',
      type: 'choose',
      picker: 'segmented',
      prompt: 'Which spacing value fits the 8pt grid?',
      options: [
        { id: 'a', label: '13px', hint: '13 is not a multiple of 8 or 4 — it\'s a magic number.' },
        { id: 'b', label: '16px' },
        { id: 'c', label: '18px', hint: '18 is not a multiple of 8. The nearest valid values: 16 or 24.' },
        { id: 'd', label: '21px', hint: '21 is not a multiple of 8 or 4.' },
      ],
      correctOptionId: 'b',
      explanation:
        '16px = 8 × 2 — it lands perfectly on the 8pt grid. The other values aren\'t multiples of 8 (or 4), so they break the rhythm.',
    },
    {
      id: 'sp-choose-2',
      type: 'choose',
      prompt:
        'You need a gap between a heading and text that\'s a bit under 16px. Which value should you pick?',
      options: [
        { id: 'a', label: '10px', hint: '10 isn\'t on the grid. The half-step gives you 12px.' },
        { id: 'b', label: '11px', hint: '11 is a magic number.' },
        { id: 'c', label: '12px' },
        { id: 'd', label: '14px', hint: '14 is not a multiple of 4. The nearest: 12 or 16.' },
      ],
      correctOptionId: 'c',
      explanation:
        '12px = 4 × 3 — it\'s the grid\'s allowed half-step (a multiple of 4). When 16px is too much and 8px too little, 12px is the right compromise.',
    },
    {
      id: 'sp-build-1',
      type: 'build',
      prompt:
        'Build an auto-layout card on the canvas: 16px gap between blocks, 24px inner padding. Stick to the 8pt grid.',
      blocks: 4,
      step: 4,
      min: 0,
      max: 40,
      target: { gap: 16, padding: 24 },
      explanation:
        'A 16px gap (8×2) sets an even vertical rhythm between blocks, while 24px padding (8×3) gives the card "breathing" edges. Both values are on the 8pt grid, so the composition looks tidy.',
    },
    {
      id: 'sp-align-1',
      type: 'align',
      prompt:
        'Drag the card so it sits in the center of the frame. It snaps to the guides and the 8pt step.',
      target: { x: 'center', y: 'middle' },
      explanation:
        'Aligning to axes and snapping to the grid is the foundation of a neat composition. The guides (left/center/right, top/middle/bottom) are the same ones Auto Layout gives you: elements land predictably rather than "roughly there".',
    },
  ],
  masteryChallenge: {
    id: 'sp-tune-1',
    type: 'tune',
    prompt:
      'Dial in the section\'s vertical spacing so it sits on the 8pt grid and equals 24px.',
    unitLabel: 'px',
    min: 0,
    max: 48,
    step: 4,
    correctValue: 24,
    tolerance: 0,
    explanation:
      '24px = 8 × 3 — a large, "breathing" gap for separating sections. It\'s a multiple of 8 and keeps the page\'s vertical rhythm.',
  },
};

export const lessons: Record<string, Lesson> = {
  [spacing8ptEn.slug]: spacing8ptEn,
};
