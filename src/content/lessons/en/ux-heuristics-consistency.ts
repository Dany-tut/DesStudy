import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — Nielsen's heuristics, part 4 of 4.
 * Consistency and standards (#4) + flexibility and efficiency of use (#7) +
 * aesthetic and minimalist design (#8).
 */
export const uxHeuristicsConsistencyEn: Lesson = {
  id: 'ux-heuristics-consistency',
  slug: 'ux-heuristics-consistency',
  title: 'Heuristics: Consistency and Efficiency',
  pathTitle: 'UX Foundations',
  skill: 'ux',
  difficulty: 'easy',
  estimatedMinutes: 10,
  objectives: [
    'Make things that mean the same look the same',
    'Give accelerators to experts without getting in beginners\' way',
    'Cut the excess — every element competes for attention',
  ],
  prerequisites: ['ux-heuristics'],
  theory: [
    'The final heuristics lesson — about **predictability**, **speed**, and **cleanliness**.',
    '**Consistency and standards** (#4): actions that mean the same thing look and behave the same across the whole product. And follow platform conventions — don\'t invent your own gesture where a standard one exists.',
    '**Flexibility and efficiency of use** (#7): give accelerators to experts — hotkeys, templates, bulk actions — in a way that doesn\'t get in beginners\' way. One product should serve both levels.',
    '**Aesthetic and minimalist design** (#8): cut the excess. Every non-essential element competes for attention with the important. Minimalism isn\'t about "empty" — it\'s about "nothing extra".',
  ],
  examples: [
    { kind: 'bad', caption: 'One button — four different styles', visual: 'components-bad' },
    { kind: 'good', caption: 'A single component in all its states', visual: 'components-good' },
  ],
  exercises: [
    {
      id: 'ux-cons-choose-1',
      type: 'choose',
      prompt:
        'In one section "Delete" is a prominent red button; in another the same action is a plain gray link among others. Which heuristic is violated?',
      options: [
        { id: 'a', label: 'Consistency and standards' },
        {
          id: 'b',
          label: 'Visibility of system status',
          hint: 'This isn\'t about status feedback, it\'s about the same-meaning actions looking different.',
        },
        {
          id: 'c',
          label: 'Aesthetic and minimalist design',
          hint: 'It\'s not about the number of elements on screen.',
        },
        {
          id: 'd',
          label: 'User control and freedom',
          hint: 'Undo and exits are a different heuristic.',
        },
      ],
      correctOptionId: 'a',
      explanation:
        'Actions that mean the same thing should look and behave the same across the whole product — otherwise a pattern learned in one place doesn\'t carry over to the rest.',
    },
    {
      id: 'ux-cons-choose-2',
      type: 'choose',
      prompt:
        'Power users complain that routine actions are too slow. What do you add under heuristic #7?',
      options: [
        { id: 'a', label: 'Hotkeys and bulk actions' },
        {
          id: 'b',
          label: 'More explanatory text at every step',
          hint: 'That helps a beginner but slows down an expert — the opposite effect.',
        },
        {
          id: 'c',
          label: 'Mandatory onboarding before every action',
          hint: 'The opposite of an accelerator: it adds friction for everyone.',
        },
        {
          id: 'd',
          label: 'Remove rarely used features',
          hint: 'Flexibility is about accelerators, not about trimming capabilities.',
        },
      ],
      correctOptionId: 'a',
      explanation:
        'Flexibility and efficiency: accelerators (shortcuts, templates, bulk operations) are invisible to a beginner but sharply speed up an expert. One interface serves both levels without getting in either\'s way.',
    },
    {
      id: 'ux-cons-choose-3',
      type: 'choose',
      prompt:
        'The settings screen is crammed with rare options, hints, and banners; the main thing gets lost. Which heuristic suffers?',
      options: [
        { id: 'a', label: 'Aesthetic and minimalist design' },
        {
          id: 'b',
          label: 'Match with the real world',
          hint: 'It\'s not about language, it\'s about the screen being overloaded.',
        },
        {
          id: 'c',
          label: 'Error prevention',
          hint: 'This isn\'t about guarding against an error, it\'s about competing for attention.',
        },
        {
          id: 'd',
          label: 'Visibility of system status',
          hint: 'Status has nothing to do with it — the problem is the excess.',
        },
      ],
      correctOptionId: 'a',
      explanation:
        'Aesthetic and minimalist design: every extra element competes for attention with the important. Take the rare and secondary off the main screen and the essence stands out more.',
    },
    {
      id: 'ux-cons-fix-screen',
      type: 'fix-screen',
      prompt:
        'The "Add a task" screen is put together sloppily: corner radii, icons, states, and tokens have drifted. Walk through the violations and bring it to a consistent look.',
      explanation:
        'Consistency lives in the details: a single radius, predictable icons, an explicit active tab, a color from a token, an even rhythm of spacing, and a prominent primary button. Individually, trivia; together, the difference between "cheap" and "polished".',
    },
    {
      id: 'ux-cons-spot-diff',
      type: 'spot-diff',
      prompt: 'Find the tile that breaks out of the system.',
      roundId: 0,
      hint: 'Scan one property at a time — first compare the corner radii across the tiles.',
      explanation:
        'Consistency is easier to feel than to describe: the eye snags on the element living "by its own rules". Here one tile has a radius off the scale (16px instead of the system\'s 8px) — a small thing, but exactly the kind of drift that makes an interface look messy. The skill is spotting the system\'s drift before it spreads across the whole product.',
    },
  ],
  masteryChallenge: {
    id: 'ux-cons-match-mastery',
    type: 'match',
    prompt: 'Match the technique to the heuristic it embodies.',
    pairs: [
      { id: 'p1', left: 'One style for the "Delete" button everywhere', right: 'Consistency and standards' },
      { id: 'p2', left: 'Hotkeys for routine tasks', right: 'Flexibility and efficiency' },
      { id: 'p3', left: 'Remove rare options from the main screen', right: 'Aesthetic and minimalist design' },
    ],
    explanation:
      'The three heuristics of this lesson work together: consistency makes the product predictable, flexibility makes it fast for experts, minimalism keeps it focused. A good interface holds all three at once.',
  },
};
