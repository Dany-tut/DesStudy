import type { Lesson } from '@/lib/curriculum/types';

/** Design Systems — one component, many variants, instead of duplicated one-offs. */
export const componentsVariantsEn: Lesson = {
  id: 'components-variants',
  slug: 'components-variants',
  title: 'Components and variants',
  pathTitle: 'Design Systems',
  skill: 'components',
  difficulty: 'hard',
  estimatedMinutes: 14,
  objectives: [
    'Tell a component variant from a new standalone layer',
    'Keep size and color variants consistent with each other',
    'Build a component so it’s easy to keep maintaining',
  ],
  prerequisites: ['design-tokens'],
  theory: [
    '**A variant** is a version of one component (size: sm/md/lg, state: default/hover/disabled), not a new layer copied and tweaked by hand. One button with a `size` parameter, not three similar buttons.',
    'Duplicates drift apart over time: you fixed the padding on one copy — forgot it on another. Half a year later the file has five "identical" buttons with different padding and radius.',
    'Variants of one component should grow **consistently**: if the font size went up from sm to lg, the spacing and radius should grow proportionally — not just the text.',
  ],
  examples: [
    {
      kind: 'bad',
      caption: 'Three "similar" buttons — actually three independent layers',
      visual: 'components-bad',
    },
    {
      kind: 'good',
      caption: 'One component, three consistent sizes',
      visual: 'components-good',
    },
  ],
  exercises: [
    {
      id: 'cv-choose-1',
      type: 'choose',
      prompt:
        'A file has five buttons — "Button", "Button 2", "Button final", each with its own padding and radius. What’s wrong?',
      options: [
        {
          id: 'a',
          label: 'Nothing, the designer was just trying out variants',
          hint: 'If these aren’t separate variants of a component, they become impossible to maintain over time.',
        },
        { id: 'b', label: 'These are one-off duplicates instead of variants of one component' },
        {
          id: 'c',
          label: 'The problem is only in the layer names',
          hint: 'It’s not the name, it’s that these are independent copies.',
        },
        { id: 'd', label: 'You just need to delete the extras', hint: 'First you need to figure out what the variant logic should be — otherwise new duplicates appear within a month.' },
      ],
      correctOptionId: 'b',
      explanation:
        'Each copy lives its own life: fixes to one don’t reach the others. The fix — one component with a parameter (size/state), not a scatter of similar layers.',
    },
    {
      id: 'cv-choose-2',
      type: 'choose',
      prompt: 'A button grew from size=sm to size=lg. What should grow along with the text?',
      options: [
        { id: 'a', label: 'Only the font size', hint: 'If the spacing didn’t change, the large text will look cramped.' },
        { id: 'b', label: 'Font, inner padding and — by the scale — radius' },
        { id: 'c', label: 'Nothing — only the font sets the size', hint: 'Then the button’s proportions will visually break.' },
        { id: 'd', label: 'Only the button height', hint: 'Height alone isn’t enough — padding and radius are part of the scale too.' },
      ],
      correctOptionId: 'b',
      explanation:
        'A size variant is a consistent set of changes: font, padding and often radius grow together, by their scale. Otherwise a large button with small padding looks disproportionate.',
    },
    {
      id: 'cv-build-1',
      type: 'build',
      prompt:
        'Assemble a card for the size=lg variant of a component: 24px gap between blocks, 32px inner padding — larger than the base size, but still on the 8pt grid.',
      blocks: 3,
      step: 8,
      min: 0,
      max: 48,
      target: { gap: 24, padding: 32 },
      explanation:
        'The lg variant takes larger steps of the same grid (24 and 32 instead of, say, 8 and 16 on sm) — the scale is consistent with the 8pt step, not picked by eye.',
    },
    {
      id: 'cv-bar-1',
      type: 'bar-build',
      prompt:
        'Assemble a mobile navigation: a floating plate at the bottom edge, navigation collapsed into a burger, with a logo and a CTA button. Pick the mode and hit "Play" to feel the behavior.',
      target: {
        placement: 'floatBottom',
        variant: 'burger',
        parts: { logo: true, nav: true, search: false, cta: true, avatar: false },
        navAlign: 'left',
      },
      explanation:
        'On mobile a big menu item doesn’t fit: the navigation collapses into a burger, while the floating bottom plate keeps the key actions in the thumb zone. It’s the same bar component, just a different variant for the context — not a new screen.',
    },
    {
      id: 'cv-states-1',
      type: 'states',
      prompt:
        'Every component should clearly respond to actions. Inspect all five states of the button and check each against the token recipe.',
      explanation:
        'A full component isn’t one picture but a set of states: default, hover, active, focus and disabled. If even one is undefined, the developer will make it up themselves — and the behavior drifts apart.',
    },
  ],
  masteryChallenge: {
    id: 'cv-file-1',
    type: 'file-upload',
    prompt:
      'Assemble a button variant sheet in Figma — at least 2 sizes × 2 states (for example sm/lg × default/disabled). Export it as PNG or PDF and attach the file.',
    accept: 'image/png,image/jpeg,application/pdf',
    maxSizeMB: 8,
    checklist: [
      'There are at least 2 size variants',
      'There are at least 2 state variants (for example default/disabled)',
      'Spacing and radius are visually consistent across sizes',
    ],
    explanation:
      'A variant sheet is a way to check the whole component: can you tell by eye that sm and lg are the same button, not two random rectangles.',
  },
};
