import type { Lesson } from '@/lib/curriculum/types';

/** UI Foundations — color contrast & WCAG. */
export const colorContrastEn: Lesson = {
  id: 'color-contrast',
  slug: 'color-contrast',
  title: 'Color and contrast (WCAG)',
  pathTitle: 'UI Foundations',
  skill: 'accessibility',
  difficulty: 'medium',
  estimatedMinutes: 9,
  objectives: [
    'Understand why contrast is about readability, not taste',
    'Memorize the WCAG AA thresholds',
    'Tell accessible text apart from unreadable text',
  ],
  prerequisites: ['spacing-8pt-grid'],
  theory: [
    '**Contrast** is the ratio of the text\'s brightness to the background. Too low and the text "drowns", especially in sunlight or for people with low vision.',
    '**WCAG AA** thresholds: regular text — **4.5:1**, large text (≥24px or ≥19px bold) — **3:1**. That\'s a minimum, not a goal.',
    'Don\'t rely on color alone: an error state is not just red, but an icon/text too. Color as the only signal is inaccessible to colorblind people.',
  ],
  examples: [
    { kind: 'bad', caption: 'Light gray on white — contrast ~1.6:1', visual: 'contrast-bad' },
    { kind: 'good', caption: 'Dark on white — contrast above 4.5:1', visual: 'contrast-good' },
  ],
  exercises: [
    {
      id: 'c-choose-1',
      type: 'choose',
      prompt: 'The minimum contrast for regular text under WCAG AA?',
      options: [
        { id: 'a', label: '2:1', hint: 'Too little — the text will be hard to read.' },
        { id: 'b', label: '3:1', hint: 'That\'s the threshold for large text, not regular.' },
        { id: 'c', label: '4.5:1' },
        { id: 'd', label: '7:1', hint: '7:1 is the AAA level, above the AA minimum.' },
      ],
      correctOptionId: 'c',
      explanation:
        '4.5:1 is the AA minimum for regular text. 3:1 is for large text. 7:1 is already the elevated AAA level.',
    },
    {
      id: 'c-swatch-1',
      type: 'choose',
      picker: 'swatches',
      prompt: 'Which text color on a white background (#FFFFFF) passes the AA threshold for regular text?',
      options: [
        { id: 'a', label: '#BDBDBD', swatch: '#BDBDBD', hint: '~1.9:1 — light gray "drowns" on white.' },
        { id: 'b', label: '#9E9E9E', swatch: '#9E9E9E', hint: '~2.8:1 — still below 4.5:1.' },
        { id: 'c', label: '#767676', swatch: '#767676' },
        { id: 'd', label: '#E0E0E0', swatch: '#E0E0E0', hint: '~1.4:1 — almost invisible.' },
      ],
      correctOptionId: 'c',
      explanation:
        '#767676 on white gives exactly ~4.54:1 — the classic "threshold" gray for AA. Anything lighter and regular text no longer passes.',
    },
    {
      id: 'c-choose-2',
      type: 'choose',
      prompt: 'A form error is shown with ONLY a red border. What\'s the accessibility problem?',
      options: [
        { id: 'a', label: 'Red is too bright', hint: 'It\'s not about brightness.' },
        { id: 'b', label: 'Color is the only signal' },
        { id: 'c', label: 'Borders aren\'t allowed at all', hint: 'Borders are fine; the problem is elsewhere.' },
        { id: 'd', label: 'Nothing, it\'s all fine', hint: 'Colorblind people won\'t distinguish red.' },
      ],
      correctOptionId: 'b',
      explanation:
        'You can\'t rely on color alone: ~8% of men can\'t distinguish red/green. Add an icon and error text next to the field.',
    },
    {
      id: 'c-contrast-1',
      type: 'contrast-tune',
      prompt:
        'Adjust the lightness of the text and background so the contrast reaches at least AA — 4.5:1.',
      targetRatio: 4.5,
      explanation:
        'Contrast grows as the text and background diverge in lightness. Dark text on a light background (or vice versa) with a difference of ≥ ~45% lightness usually passes AA.',
    },
    {
      id: 'c-hotspot-1',
      type: 'hotspot',
      prompt:
        'There\'s a touch accessibility problem on the screen. Click the element that breaks it.',
      zone: { x0: 74, y0: 82, x1: 98, y1: 98 },
      hint: 'Look for the action element — which one is too small for a finger?',
      explanation:
        'The main action button ("OK") is squeezed down to ~24×20px — smaller than the minimum 44×44px tap target. People miss these, especially on the move. An action should be large and obvious.',
    },
  ],
  masteryChallenge: {
    id: 'c-choose-3',
    type: 'choose',
    prompt: 'A large heading, 28px bold. What minimum contrast is allowed under AA?',
    options: [
      { id: 'a', label: '3:1' },
      { id: 'b', label: '4.5:1', hint: 'That\'s for regular text; large text can be 3:1.' },
      { id: 'c', label: '7:1', hint: 'That\'s AAA, above the minimum.' },
      { id: 'd', label: '1.5:1', hint: 'Too little even for large text.' },
    ],
    correctOptionId: 'a',
    explanation:
      'Large text (≥24px, or ≥19px bold) is easier to read, so the AA threshold for it is 3:1.',
  },
};
