import type { Lesson } from '@/lib/curriculum/types';

/**
 * Design Process — the visual layer: building a colour palette (base / support /
 * styles) and placing elements (background / card / accent) with intent.
 */
export const paletteElementsEn: Lesson = {
  id: 'palette-elements',
  slug: 'palette-elements',
  title: 'Palette and elements',
  pathTitle: 'Design Process',
  skill: 'visual',
  difficulty: 'medium',
  estimatedMinutes: 12,
  objectives: [
    'Build a palette from primary, supporting, and style colors',
    'Tell apart element roles: background, card, accent',
    'Keep the accent-to-background contrast readable',
  ],
  prerequisites: ['color-contrast'],
  theory: [
    'A palette is **roles**, not a set of pretty colors. **Primary** colors carry the brand and key actions; **supporting** ones — backgrounds, surfaces, borders; **style/status** ones — success, error, warning.',
    'Fewest colors — most use. Define few roles and add a new one only when an existing one truly doesn\'t fit. A rainbow of shades destroys hierarchy just like a rainbow of fonts.',
    '**Elements by layer**: background — the calmest layer; card — a surface slightly above the background (shadow/border/lightness); accent — what should stand out (button, badge, an important number).',
    'An accent only works against a calm surrounding. If everything "shouts", nothing does. One or two accent colors per screen, the rest — neutrals.',
    'Check the accent\'s contrast against the background just like text: an important button should read confidently, not blend into the surface.',
  ],
  examples: [
    { kind: 'bad', caption: 'Five bright colors at once — the accent doesn\'t read', visual: 'tokens-bad' },
    { kind: 'good', caption: 'A neutral background + one accent — clear hierarchy', visual: 'tokens-good' },
  ],
  exercises: [
    {
      id: 'pe-choose-1',
      type: 'choose',
      prompt: 'Which palette group does the color of the main action button belong to?',
      options: [
        { id: 'a', label: 'Primary (brand/actions)' },
        { id: 'b', label: 'Supporting (backgrounds/borders)', hint: 'Backgrounds and borders are the calm layer, not the main button.' },
        { id: 'c', label: 'Status (success/error)', hint: 'Status colors convey a state, not the primary action.' },
        { id: 'd', label: 'None — picked at random', hint: 'The action color is a deliberate role, not chance.' },
      ],
      correctOptionId: 'a',
      explanation:
        'The main button carries the key action — that\'s the primary (brand) color. Supporting colors hold surfaces, status colors hold states. The role drives the choice, not "what looks prettier".',
    },
    {
      id: 'pe-swatch-1',
      type: 'choose',
      picker: 'swatches',
      prompt: 'Which color works as an accent on a light neutral background (#F5F6F8)?',
      options: [
        { id: 'a', label: '#5B6EF5', swatch: '#5B6EF5' },
        { id: 'b', label: '#EDEFF3', swatch: '#EDEFF3', hint: 'Almost blends into the background — the accent won\'t stand out.' },
        { id: 'c', label: '#FAFBFC', swatch: '#FAFBFC', hint: 'Lighter than the background — invisible as an accent.' },
        { id: 'd', label: '#E8EAF0', swatch: '#E8EAF0', hint: 'Too close to the background in lightness.' },
      ],
      correctOptionId: 'a',
      explanation:
        'An accent should break away from the background in lightness and saturation. A saturated blue on light gray reads confidently; grayish-blues close to the background are useless as an accent.',
    },
    {
      id: 'pe-choose-2',
      type: 'choose',
      prompt: 'A screen has seven equally bright color blocks. What\'s the problem?',
      options: [
        { id: 'a', label: 'No hierarchy — when everything "shouts", nothing stands out' },
        { id: 'b', label: 'Too few colors', hint: 'The opposite — their excess destroys the accent.' },
        { id: 'c', label: 'The problem is only in how the shades pair', hint: 'Even when they pair well, seven accents cancel each other out.' },
        { id: 'd', label: 'Nothing, it looks lively', hint: '"Lively" here means noisy and unfocused.' },
      ],
      correctOptionId: 'a',
      explanation:
        'An accent only works against a calm background. One or two bright colors per screen set the focus; seven equally bright blocks compete with each other, and the eye has nothing to latch onto.',
    },
    {
      id: 'pe-match-1',
      type: 'match',
      prompt: 'Match the element role with its place in the screen\'s layers.',
      pairs: [
        { id: 'bg', left: 'Background', right: 'the calmest layer' },
        { id: 'card', left: 'Card', right: 'a surface above the background' },
        { id: 'accent', left: 'Accent', right: 'button / important number' },
        { id: 'border', left: 'Border', right: 'quietly separates blocks' },
      ],
      explanation:
        'Layers create depth and order: a calm background, raised cards, a rare bright accent, and quiet borders. Each element knows its place — then the screen reads on its own.',
    },
    {
      id: 'pe-contrast-1',
      type: 'contrast-tune',
      prompt:
        'Tune the lightness of the accent plate and the background so the accent reads confidently — contrast no lower than AA (4.5:1).',
      targetRatio: 4.5,
      explanation:
        'An accent is checked with contrast just like text. If an important plate falls short of 4.5:1 against the background, it "sinks" — especially in bright light and for low-vision users. Spread the lightness until the accent becomes confident.',
    },
  ],
  masteryChallenge: {
    id: 'pe-choose-3',
    type: 'choose',
    prompt:
      'You\'re building a palette for a new product. Where\'s the smarter place to start so you don\'t drown in shades?',
    options: [
      {
        id: 'a',
        label: 'Set a minimum of roles and add a color only on clear need',
      },
      { id: 'b', label: 'Pick 10 pretty shades right away', hint: 'An excess of colors without roles turns into noise.' },
      { id: 'c', label: 'Copy a competitor\'s palette', hint: "Someone else's roles don't have to fit your product." },
      { id: 'd', label: 'Choose colors by mood', hint: 'Mood isn\'t a system; a palette is built from roles.' },
    ],
    correctOptionId: 'a',
    explanation:
      'A palette is a system of roles, not a collection of shades. Start with a minimum (primary, neutrals, a couple of statuses) and introduce a new color only when an existing one truly doesn\'t solve the task. That keeps the hierarchy manageable.',
  },
};
