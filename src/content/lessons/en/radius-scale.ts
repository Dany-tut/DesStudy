import type { Lesson } from '@/lib/curriculum/types';

/** UI Foundations — corner radius scale. */
export const radiusScaleEn: Lesson = {
  id: 'radius-scale',
  slug: 'radius-scale',
  title: 'Corner radius and the radius scale',
  pathTitle: 'UI Foundations',
  skill: 'radius',
  difficulty: 'easy',
  estimatedMinutes: 7,
  objectives: [
    'Understand why an interface needs a single radius scale',
    'Learn to pick a radius from the scale rather than "by eye"',
    'Coordinate the radii of nested elements',
  ],
  prerequisites: ['spacing-8pt-grid'],
  theory: [
    'Corner radii, like spacing, live on a **scale**: for example `6 · 10 · 14 · 20 · full`. Random values (3, 11, 19) break consistency.',
    'The nesting rule: an inner element\'s radius is **smaller** than its container\'s — otherwise the corners "drift". Often `inner = outer − padding`.',
    'Small elements (chips, inputs) get a small radius; large cards get a medium one; avatars and pills get `full`.',
    'Radius is part of a brand\'s language: sharp corners read as stricter and more technical, large rounding as softer and friendlier. Changing the whole scale noticeably shifts an interface\'s character even if everything else stays the same.',
  ],
  examples: [
    { kind: 'bad', caption: 'Random radii 3/11/19 — a mismatch', visual: 'radius-bad' },
    { kind: 'good', caption: 'Radii 6/10/14 on the scale — coordinated', visual: 'radius-good' },
  ],
  exercises: [
    {
      id: 'r-tune-1',
      type: 'tune',
      prompt: 'Drag the card\'s corner and set the radius to the scale node `radius.lg`.',
      unitLabel: 'px',
      min: 0,
      max: 28,
      step: 2,
      correctValue: 14,
      tolerance: 0,
      visual: 'radius',
      explanation:
        '14px is a node value on the scale (`radius.lg`). The marker snaps to the scale on its own, so in-between values like 11 or 17 won\'t stick.',
    },
    {
      id: 'r-choose-2',
      type: 'choose',
      prompt:
        'A card with a 16px radius, and inside it a button with 8px padding. Which button radius is coordinated?',
      options: [
        { id: 'a', label: '16px', hint: 'Equal radius: the button\'s corners will "bump into" the card\'s corners.' },
        { id: 'b', label: '8px' },
        { id: 'c', label: '20px', hint: 'The inner radius should not be larger than the outer one.' },
        { id: 'd', label: '2px', hint: 'Too small — it looks almost square.' },
      ],
      correctOptionId: 'b',
      explanation:
        'The nesting rule: inner radius = outer − padding = 16 − 8 = 8px. Then the concentric corners look tidy.',
    },
    {
      id: 'r-choose-scale-1',
      type: 'choose',
      prompt:
        'On desktop the elements are bigger than on mobile. Should you scale the corner radius up proportionally along with the screen size?',
      options: [
        {
          id: 'a',
          label: 'Yes, to keep the element\'s visual proportions',
          hint: 'Radius is a value from the brand scale, not a proportion of the screen size.',
        },
        { id: 'b', label: 'No, the radius stays a value from the scale regardless of screen size' },
        {
          id: 'c',
          label: 'Only for large cards, not for buttons',
          hint: 'An inconsistent rule complicates the system without benefit.',
        },
        {
          id: 'd',
          label: 'Only on mobile; on desktop remove the radius entirely',
          hint: 'This would destroy the brand\'s consistency across platforms.',
        },
      ],
      correctOptionId: 'b',
      explanation:
        'The radius scale is a fixed set of brand values not tied to screen size. A 10px button looks coordinated on mobile and desktop precisely because it\'s the same scale value.',
    },
  ],
  masteryChallenge: {
    id: 'r-choose-3',
    type: 'choose',
    prompt: 'What should you choose for a user avatar?',
    options: [
      { id: 'a', label: 'radius 6', hint: 'A small radius is for chips and inputs.' },
      { id: 'b', label: 'radius 14', hint: 'Medium is for cards.' },
      { id: 'c', label: 'radius full', },
      { id: 'd', label: 'radius 0', hint: 'Sharp corners look harsh for an avatar.' },
    ],
    correctOptionId: 'c',
    explanation:
      'Avatars and "pills" use `full` (9999px) — a perfect circle regardless of size.',
  },
};
