import type { Lesson } from '@/lib/curriculum/types';

/**
 * UI Foundations — responsive/adaptive layout: mobile vs desktop type scales,
 * breakpoints, and reflowing composition instead of shrinking it.
 */
export const responsiveLayoutEn: Lesson = {
  id: 'responsive-layout',
  slug: 'responsive-layout',
  title: 'Responsive: mobile and desktop',
  pathTitle: 'UI Foundations',
  skill: 'responsive',
  difficulty: 'medium',
  estimatedMinutes: 14,
  objectives: [
    'Set different type scales for mobile and desktop',
    'Understand breakpoints and reflow, not plain scaling',
    'Preserve hierarchy and tap targets on narrow screens',
  ],
  prerequisites: ['type-hierarchy', 'grids-composition'],
  theory: [
    'Responsive design is a **reflow**, not a shrunken copy of the desktop. Blocks rearrange: a multi-column layout folds into a single column, navigation becomes a burger, a side panel moves to the bottom.',
    'Typography adapts too. A practical example of scales: on **mobile** H1 32 / H2 28 / H3 24 / H4 20; on **desktop** H1 40 / H2 32 / H3 28 / H4 24. Headings are larger on the big screen, while body stays readable (14–16px).',
    'A **breakpoint** is the width at which the layout changes. You set them by content (where the layout "breaks"), not by specific device models.',
    'On narrow screens, **tap targets** (≥44px) and priority are critical: the main action stays visible, secondary ones hide in a menu. Hierarchy matters more than "everything fit".',
    'Rule: design for the narrowest screen first (mobile-first) — it forces you to pick the essentials. Expanding is easier than cramming.',
  ],
  examples: [
    { kind: 'bad', caption: 'Desktop squeezed down to mobile — everything tiny and cramped', visual: 'spacing-bad' },
    { kind: 'good', caption: 'Layout rebuilt into a single column — readable', visual: 'spacing-good' },
  ],
  exercises: [
    {
      id: 'rl-choose-1',
      type: 'choose',
      prompt: 'What does "responsive layout" mean in the correct sense?',
      options: [
        { id: 'a', label: 'Blocks reflow to fit the screen width' },
        { id: 'b', label: 'The desktop layout scales down proportionally', hint: 'Then text and tap targets become unreadably tiny.' },
        { id: 'c', label: 'A separate site is drawn for each device', hint: 'That’s duplicates; responsive is one system that changes the layout.' },
        { id: 'd', label: 'You just turn on horizontal scrolling', hint: 'Horizontal scroll on mobile is an anti-pattern.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Responsive rebuilds the composition: columns fold, navigation collapses, the order of blocks changes. It’s not scaling a picture and not separate sites, but one flexible system.',
    },
    {
      id: 'rl-choose-2',
      type: 'choose',
      picker: 'segmented',
      prompt: 'H1 on desktop by the practical scale — what size?',
      options: [
        { id: 'a', label: '24' , hint: 'That’s closer to H4 desktop / H3.' },
        { id: 'b', label: '32', hint: 'That’s H1 mobile / H2 desktop.' },
        { id: 'c', label: '40' },
      ],
      correctOptionId: 'c',
      explanation:
        'On a wide screen the heading can speak louder: H1 desktop ≈ 40px against 32px on mobile. Body stays ~14–16px meanwhile — the large heading leads, the text doesn’t balloon.',
    },
    {
      id: 'rl-scale-1',
      type: 'scale-ramp',
      prompt:
        'Build the mobile scale: base body size 16px, ratio 1.25. Check how neatly the headings grow for a narrow screen.',
      targetBase: 16,
      targetRatio: 1.25,
      explanation:
        'The same modular-scale logic works in responsive too: one ratio (1.25) from a base of 16px gives a consistent series. On desktop you can raise the base and/or the step, but the "one coefficient" principle holds.',
    },
    {
      id: 'rl-choose-3',
      type: 'choose',
      prompt: 'How do you choose breakpoints?',
      options: [
        { id: 'a', label: 'By content — where the layout starts to break' },
        { id: 'b', label: 'Exactly for iPhone/iPad and popular models', hint: 'There are too many models and they change; pinning to them is fragile.' },
        { id: 'c', label: 'Every 100px exactly', hint: 'A mechanical step has nothing to do with the real layout.' },
        { id: 'd', label: 'One breakpoint for everything', hint: 'You usually need several reflow points.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Breakpoints go where the content stops fitting properly. Pinning to specific devices goes stale; pinning to how the layout behaves is durable.',
    },
    {
      id: 'rl-resize-1',
      type: 'resize-frame',
      prompt:
        'Drag the frame and find the tablet width — 768px. Notice how at this point the gallery rebuilds from one column into two.',
      minWidth: 320,
      maxWidth: 1200,
      targetWidth: 768,
      tolerance: 24,
      breakpoints: [
        { at: 0, columns: 1, label: 'Mobile' },
        { at: 600, columns: 2, label: 'Tablet' },
        { at: 960, columns: 3, label: 'Desktop' },
      ],
      explanation:
        'A breakpoint is the width at which the layout rebuilds. Around 768px a single column gets cramped for the cards, and the grid unfolds into two. You set the point where the content "asks" for a reflow, not to a specific tablet model.',
    },
    {
      id: 'rl-tap-target',
      type: 'tap-target',
      prompt: 'The button is too small for a finger. Grow it to a safe tap target of ≥44px.',
      hint: 'HIG and WCAG 2.5.5 agree on a minimum of 44px per side — below that the finger starts to miss.',
      explanation:
        'On a touchscreen you aim at the button with a finger, not a cursor, so it needs area, not just a label. A minimum of 44×44px (HIG, WCAG 2.5.5) — below that misses grow, especially on the move and one-handed. A small but hittable target beats a dense layout.',
    },
    {
      id: 'rl-choose-4',
      type: 'choose',
      prompt: 'Why design mobile-first?',
      options: [
        { id: 'a', label: 'A narrow screen forces you to pick the essentials; expanding is easier' },
        { id: 'b', label: 'Because there are always more mobile users', hint: 'Not always — and it’s not about statistics, it’s about the discipline of priorities.' },
        { id: 'c', label: 'Because CSS requires it', hint: 'CSS allows both; this is a methodology, not a constraint.' },
        { id: 'd', label: 'So you don’t make a desktop version at all', hint: 'You do make desktop — you just expand from the mobile base.' },
      ],
      correctOptionId: 'a',
      explanation:
        'On a small screen not everything fits, and that’s useful: you’re forced to decide what’s truly essential. Adding space on desktop is easier than squeezing an overloaded layout.',
    },
  ],
  masteryChallenge: {
    id: 'rl-choose-5',
    type: 'choose',
    prompt:
      'A desktop header: logo, 6 menu items, search, profile. How do you adapt it for mobile?',
    options: [
      {
        id: 'a',
        label: 'Logo + key action stay visible, menu goes into a burger',
      },
      { id: 'b', label: 'Shrink everything so it fits in one row', hint: 'The items become tiny and un-hittable — tap targets under 44px.' },
      { id: 'c', label: 'Leave it as is with horizontal scroll', hint: 'A horizontally scrolling header is non-obvious and awkward.' },
      { id: 'd', label: 'Remove the navigation entirely', hint: 'Navigation is needed — you collapse it, not delete it.' },
    ],
    correctOptionId: 'a',
    explanation:
      'On mobile you keep the essentials visible (logo, key action) and collapse the full menu into a burger. That preserves hierarchy and large tap targets instead of cramming the whole desktop into a narrow strip.',
  },
};
