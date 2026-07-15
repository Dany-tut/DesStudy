import type { Lesson } from '@/lib/curriculum/types';

/**
 * UI Foundations — grids & composition: column grids, bento, the golden ratio,
 * visual anchors and the nested-radius rule.
 */
export const gridsCompositionEn: Lesson = {
  id: 'grids-composition',
  slug: 'grids-composition',
  title: 'Grids and composition',
  pathTitle: 'UI Foundations',
  skill: 'grids',
  difficulty: 'medium',
  estimatedMinutes: 13,
  objectives: [
    'Pick the right grid for the job: columns, bento, golden ratio',
    'Place a visual anchor that guides the eye',
    'Apply the nested-radius rule (outer / inner radius)',
  ],
  prerequisites: ['spacing-8pt-grid', 'radius-scale'],
  theory: [
    '**Column grid** (12 columns) is the workhorse for pages and landings: columns set the widths, gutters set the rhythm between them. Everything aligns to the columns, not "by eye".',
    '**Bento** is a modular grid of tiles in different sizes, like a bento box. Great for dashboards and feature showcases: a different tile size signals a different importance.',
    '**The golden ratio** (~1.618) and modular proportions help you split space into parts that feel pleasing — for example, the main block to the secondary one at roughly 62/38.',
    '**A visual anchor** is the simplest graphic move: one large element (a number, a photo, a typographic accent) that catches the eye first and sets the entry point into the composition.',
    '**The nested-radius rule**: inner radius = outer − the gap between them. If a card has a 20px radius and 10px padding, a nested button gets a radius of ≈ 10px — then the corners are concentric and look tidy.',
  ],
  examples: [
    { kind: 'bad', caption: 'Blocks aligned "by eye" — no grid reads through', visual: 'spacing-bad' },
    { kind: 'good', caption: 'Everything on a 12-column grid — clean rhythm', visual: 'spacing-good' },
  ],
  exercises: [
    {
      id: 'gr-choose-1',
      type: 'choose',
      prompt: 'A dashboard of metric cards with different weight: big KPIs and small figures. Which grid fits best?',
      options: [
        { id: 'a', label: 'Bento — tiles of different sizes' },
        { id: 'b', label: 'A strict 12-column grid with equal blocks', hint: 'Equal blocks won’t convey the different importance of the metrics.' },
        { id: 'c', label: 'A single column as a list', hint: 'A list doesn’t use the width and sets no accents.' },
        { id: 'd', label: 'No grid, free-form', hint: 'A free-form layout on a dashboard quickly turns into chaos.' },
      ],
      correctOptionId: 'a',
      explanation:
        'A bento grid lets tiles of different sizes show the hierarchy of the data: a big KPI takes a large tile, secondary ones take small tiles. That’s its main strength on dashboards.',
    },
    {
      id: 'gr-choose-2',
      type: 'choose',
      prompt: 'What is a "visual anchor" in composition?',
      options: [
        { id: 'a', label: 'The element that catches the eye first and sets the entry point' },
        { id: 'b', label: 'A fixed button at the bottom of the screen', hint: 'That’s about bar behavior, not a compositional accent.' },
        { id: 'c', label: 'A logo in the corner', hint: 'A logo isn’t necessarily the main accent of the composition.' },
        { id: 'd', label: 'A grid of guides', hint: 'Guides help you align, but they aren’t an anchor themselves.' },
      ],
      correctOptionId: 'a',
      explanation:
        'An anchor is the most noticeable element (a big number, a photo, a typographic accent). It catches the eye first and leads it onward through the composition. A typographic accent is the simplest and most effective anchor.',
    },
    {
      id: 'gr-tune-1',
      type: 'tune',
      prompt:
        'A card has a 20px outer radius and 10px inner padding. Pick the nested button’s radius so the corners are concentric.',
      unitLabel: 'px',
      min: 0,
      max: 20,
      step: 2,
      correctValue: 10,
      tolerance: 0,
      explanation:
        'The nesting rule: inner radius = outer − padding. 20 − 10 = 10px. Then the button’s arc repeats the card’s arc, and the corners look like one system rather than two random roundings.',
    },
    {
      id: 'gr-nested-1',
      type: 'nested-radius',
      prompt:
        'A card with a 24px radius and 8px padding. Pick the nested button’s radius so the corners become concentric.',
      outerRadius: 24,
      padding: 8,
      maxRadius: 24,
      explanation:
        'Inner = outer − padding = 24 − 8 = 16px. At this value the button’s arc runs parallel to the card’s arc — the corners are "nested" inside each other. More, and the button is rounder than the card; less, and the corner is sharper.',
    },
    {
      id: 'gr-align-1',
      type: 'align',
      prompt:
        'Place the accent block in the top-left corner of the frame — the classic entry point for a left-to-right, top-to-bottom gaze.',
      target: { x: 'left', y: 'top' },
      explanation:
        'In left-reading cultures the eye starts at the top-left corner. Put the anchor there and you match the natural reading path — the composition "starts up" right away.',
    },
    {
      id: 'gr-order-1',
      type: 'order',
      prompt: 'Put the steps of building a layout in the right order.',
      items: [
        { id: 'grid', label: 'Pick a grid (columns / bento)', size: 'body' },
        { id: 'anchor', label: 'Place the visual anchor', size: 'body' },
        { id: 'blocks', label: 'Lay the blocks onto the grid', size: 'body' },
        { id: 'polish', label: 'Fine-tune the radii and spacing', size: 'body' },
      ],
      correctOrder: ['grid', 'blocks', 'anchor', 'polish'],
      explanation:
        'First the frame (the grid), then laying the blocks onto it, then the anchor accent inside the finished structure, and finally the fine polish of radii and spacing. The order goes from general to specific.',
    },
  ],
  masteryChallenge: {
    id: 'gr-choose-3',
    type: 'choose',
    prompt:
      'You need to split a landing screen into a main block and a secondary one so the split feels pleasing. Which proportion is closest to the golden ratio?',
    options: [
      { id: 'a', label: '50 / 50', hint: 'Exactly in half — stable, but with no clear hierarchy.' },
      { id: 'b', label: '62 / 38' },
      { id: 'c', label: '90 / 10', hint: 'Too contrasty — the second block gets lost.' },
      { id: 'd', label: '75 / 25', hint: 'Closer, but the golden ratio gives ~62/38.' },
    ],
    correctOptionId: 'b',
    explanation:
      'The golden ratio ≈ 1.618, which gives a split of about 62/38. That proportion reads as naturally balanced — the main block clearly dominates, but the second one doesn’t look like a leftover scrap.',
  },
};
