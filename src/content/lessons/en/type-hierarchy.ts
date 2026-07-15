import type { Lesson } from '@/lib/curriculum/types';
import { Type, Palette, Bold, Square } from 'lucide-react';

/** UI Foundations — typographic hierarchy (uses the drag-to-order canvas). */
export const typeHierarchyEn: Lesson = {
  id: 'type-hierarchy',
  slug: 'type-hierarchy',
  title: 'Typographic hierarchy',
  pathTitle: 'UI Foundations',
  skill: 'hierarchy',
  difficulty: 'easy',
  estimatedMinutes: 10,
  objectives: [
    'Understand how size, weight, and color create hierarchy',
    'Learn to build the order of attention on a screen',
    'Tell flat layout apart from clear hierarchy',
  ],
  prerequisites: ['spacing-8pt-grid'],
  theory: [
    'Hierarchy tells the eye **what to read first**. Three tools create it: **size**, **weight**, and **color** — not decorations.',
    'One level, one device. A heading is bigger and bolder; supporting text is smaller and muted. When everything is the same, there\'s no hierarchy and the screen is "flat".',
    'The order of attention is usually: heading → subheading → body text → caption → action (the button stands out by color, not size).',
    'Hierarchy should read even without color — in black-and-white print or for someone with a color-vision deficiency. If the only difference between heading and text is color rather than size and weight, the hierarchy vanishes instantly in those conditions.',
  ],
  examples: [
    { kind: 'bad', caption: 'Everything one size — no hierarchy', visual: 'hierarchy-bad' },
    { kind: 'good', caption: 'Size + weight + color — a clear order', visual: 'hierarchy-good' },
  ],
  exercises: [
    {
      id: 'h-choose-1',
      type: 'choose',
      picker: 'tiles',
      prompt: 'What should you NOT use to create hierarchy first?',
      options: [
        { id: 'a', label: 'Size', icon: Type },
        { id: 'b', label: 'Color', icon: Palette },
        { id: 'c', label: 'Weight', icon: Bold },
        { id: 'd', label: 'Borders', icon: Square },
      ],
      correctOptionId: 'd',
      explanation:
        'Hierarchy is carried by size, weight, and color. Borders and shadows are decor: they add noise and rarely help you understand what matters more.',
    },
    {
      id: 'h-choose-2',
      type: 'choose',
      prompt:
        'A heading and regular text are the same size and weight — they differ only in color (heading blue, text gray). What happens in black-and-white print?',
      options: [
        { id: 'a', label: 'The hierarchy disappears — both texts become indistinguishable by eye' },
        {
          id: 'b',
          label: 'Nothing, color is a reliable enough signal on its own',
          hint: 'Without a difference in size or weight, the hierarchy rests on color perception alone.',
        },
        {
          id: 'c',
          label: 'It only affects print; on screen everything stays as is',
          hint: 'Color-vision deficiencies matter on screen too, not just in print.',
        },
        {
          id: 'd',
          label: 'The hierarchy becomes even clearer',
          hint: 'The opposite — the only distinguishing cue is lost.',
        },
      ],
      correctOptionId: 'a',
      explanation:
        'Color is the least reliable carrier of hierarchy: without a difference in size or weight, the first constraint (black-and-white print, a color-vision deficiency, low-contrast mode) erases the difference completely.',
    },
    {
      id: 'h-order-1',
      type: 'order',
      prompt: 'Drag the elements into the correct hierarchy order — from most to least important.',
      items: [
        { id: 'body', label: 'Product and specs description', size: 'body' },
        { id: 'title', label: 'Product name', size: 'title' },
        { id: 'caption', label: 'Item · SKU-2481', size: 'caption' },
        { id: 'subtitle', label: 'Category: Headphones', size: 'body' },
      ],
      correctOrder: ['title', 'subtitle', 'body', 'caption'],
      explanation:
        'First the name (the main thing), then the category as a subheading, then the description, and at the very bottom the utility caption (the SKU). This way the eye moves from what\'s important to the details.',
    },
    {
      id: 'h-scale-1',
      type: 'scale-ramp',
      prompt:
        'Build a modular scale for the interface: base body size 16px and a ratio of 1.25 (major third) — the gold standard for UI.',
      targetBase: 16,
      targetRatio: 1.25,
      explanation:
        'A scale is built from ONE ratio: each next size = the previous one × the factor. 16px × 1.25 gives a calm, easily distinguishable range of headings without harsh jumps.',
    },
  ],
  masteryChallenge: {
    id: 'h-order-2',
    type: 'order',
    prompt: 'Build the hierarchy of a payment screen — from what people see first to last.',
    items: [
      { id: 'hint', label: 'By tapping "Pay" you accept the terms', size: 'caption' },
      { id: 'amount', label: '$49.90', size: 'display' },
      { id: 'label', label: 'Amount due', size: 'body' },
      { id: 'cta', label: 'Pay', size: 'button' },
    ],
    correctOrder: ['label', 'amount', 'cta', 'hint'],
    explanation:
      'The "Amount due" label introduces context, the large amount is the screen\'s focus, then the action button, and the small legal note is at the very bottom.',
  },
};
