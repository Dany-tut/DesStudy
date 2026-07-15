import type { Lesson } from '@/lib/curriculum/types';

/** Design Systems — tokens: named values instead of magic numbers/hexes. */
export const designTokensEn: Lesson = {
  id: 'design-tokens',
  slug: 'design-tokens',
  title: 'Design tokens',
  pathTitle: 'Design Systems',
  skill: 'tokens',
  difficulty: 'medium',
  estimatedMinutes: 12,
  objectives: [
    'Understand the difference between a primitive and a semantic token',
    'See why a hardcoded color breaks dark mode',
    'Use a token scale instead of "by eye" values',
  ],
  prerequisites: ['spacing-8pt-grid', 'radius-scale'],
  theory: [
    '**A token** is a named value instead of a bare number or hex: not `#5B6EF5`, but `brand`. The name describes the role, and the value can be changed centrally.',
    '**A primitive** is a raw value in the palette (`brand500 = #5B6EF5`). **A semantic token** references a primitive by meaning (`brand → brand500` in the light theme, `brand → brand400` in the dark one). Components use only semantics.',
    'If a color is baked in as a hex right in the component, dark mode is impossible without editing every spot. A semantic token changes the value in one place — and the whole system follows.',
    'It’s not only color and sizes that get tokenized. **Shadow (elevation)** is a token scale too: `elevation.0…4`. Each level sets an "offset + blur + opacity" bundle at once, so you choose depth by level rather than tweaking four shadow sliders by hand. The higher the level — the "higher" the element floats above the plane (menu, popover, modal).',
  ],
  examples: [
    { kind: 'bad', caption: 'Hex colors reinvented on every screen', visual: 'tokens-bad' },
    { kind: 'good', caption: 'The same named token — everywhere', visual: 'tokens-good' },
  ],
  exercises: [
    {
      id: 'dt-choose-1',
      type: 'choose',
      prompt: 'Which of these is a semantic token, not a primitive?',
      options: [
        { id: 'a', label: '#5B6EF5', hint: 'That’s a raw palette value, with no role.' },
        { id: 'b', label: 'brand500', hint: 'That’s a primitive — a fixed shade in the palette.' },
        { id: 'c', label: 'text-primary' },
        { id: 'd', label: 'rgb(20, 23, 28)', hint: 'That’s a raw value too, not a role name.' },
      ],
      correctOptionId: 'c',
      explanation:
        '`text-primary` names a role ("primary text"), not a specific shade — the value changes with the theme, but the name and meaning stay the same.',
    },
    {
      id: 'dt-choose-2',
      type: 'choose',
      prompt: 'Why does a hardcoded `color: #14171C` in a component break dark mode?',
      options: [
        {
          id: 'a',
          label: 'It doesn’t break it — you just need a separate file for the dark theme',
          hint: 'Then you’d have to duplicate every component — tokens exist to avoid exactly that.',
        },
        { id: 'b', label: 'The value is baked in for good and not wired to the theme switch' },
        {
          id: 'c',
          label: 'The problem is only performance',
          hint: 'It’s not about speed, it’s that the value doesn’t react to the theme.',
        },
        { id: 'd', label: 'Hex always reads worse than rgb', hint: 'The color’s notation format is irrelevant here.' },
      ],
      correctOptionId: 'b',
      explanation:
        'A hardcode is a value with no role: the interface can’t tell that it should change when the theme switches. A token solves this, because the component references a role, not a number.',
    },
    {
      id: 'dt-tune-1',
      type: 'tune',
      prompt:
        'On the radius scale the node values are 0 · 6 · 10 · 14 · 20 · 28. Pick the value for the token `radius.lg`.',
      unitLabel: 'px',
      min: 0,
      max: 28,
      step: 2,
      correctValue: 14,
      tolerance: 0,
      explanation:
        '`radius.lg = 14px` — the standard scale node for large cards. The token gives this specific number a name and a place in the system, rather than leaving it "by eye".',
    },
    {
      id: 'dt-elevation-1',
      type: 'elevation',
      prompt:
        'A modal window needs shadow level `elevation.3` — it "floats" high above the content. Raise the card to the third level.',
      label: 'Modal window',
      maxLevel: 4,
      targetLevel: 3,
      explanation:
        'Elevation is a discrete scale: level 3 sets the offset, the blur, and the opacity of the shadow with one token. Modals and popovers live high (3–4), cards low (1). By choosing a level rather than separate shadow parameters, you keep depth systematic and predictable.',
    },
    {
      id: 'dt-match-1',
      type: 'match',
      prompt: 'Match each token to its value from the scale.',
      pairs: [
        { id: 'space2', left: 'space.2', right: '8px' },
        { id: 'space4', left: 'space.4', right: '16px' },
        { id: 'space8', left: 'space.8', right: '32px' },
        { id: 'radiusLg', left: 'radius.lg', right: '14px' },
        { id: 'radiusFull', left: 'radius.full', right: '9999px' },
      ],
      explanation:
        'Token values sit on their scales: space is a multiple of the base step (8·n), radius.full = 9999px gives a fully round shape. Holding the values in your head as names rather than numbers, you build the interface from a system, not from random amounts.',
    },
  ],
  masteryChallenge: {
    id: 'dt-choose-3',
    type: 'choose',
    prompt:
      'A button needs a background color on hover. How should you name the reusable token for this value?',
    options: [
      { id: 'a', label: 'hoverColor1', hint: 'Doesn’t describe a role and doesn’t follow the agreed naming scheme.' },
      { id: 'b', label: '#4557E0', hint: 'That’s a primitive, not a semantic name — it won’t survive a palette change.' },
      { id: 'c', label: 'brand-hover' },
      { id: 'd', label: 'blueDark', hint: 'The name describes the color, not the role — it’ll break on a rebrand.' },
    ],
    correctOptionId: 'c',
    explanation:
      '`brand-hover` names a role ("hover state on a brand element"), not a specific shade — on a palette or theme change the name stays correct.',
  },
};
