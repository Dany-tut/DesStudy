import type { Lesson } from '@/lib/curriculum/types';

/**
 * UI Foundations — micro-typography: the small rules that separate amateur from
 * professional text. Line-height vs size, trim zone, dashes/quotes/orphans.
 */
export const microTypographyEn: Lesson = {
  id: 'micro-typography',
  slug: 'micro-typography',
  title: 'Micro-typography',
  pathTitle: 'UI Foundations',
  skill: 'typography',
  difficulty: 'medium',
  estimatedMinutes: 12,
  objectives: [
    'Tie line-height to the text\'s font size',
    'Use the hyphen, the em dash, and curly quotes correctly',
    'Remove orphaned short words and understand the trim zone around text',
  ],
  prerequisites: ['type-hierarchy'],
  theory: [
    'The line-height rule: **the larger the font size, the smaller the relative line-height**. Small text (12–16px) breathes at a line-height of ~1.4–1.5; a large heading (32px+) only needs 1.1–1.2, otherwise the lines "spread apart".',
    'A practical rule of thumb from the cheat sheet: `font-size 12px + 2–4px = 14–16px line-height`. The addition in absolute pixels stays roughly constant, so as a percentage it\'s smaller for large text.',
    'The **hyphen (-)** joins parts of a word (well-known, sign-in). The **em dash (—)** separates parts of a sentence and is set with spaces. They\'re different marks, not interchangeable.',
    'In polished text the quotes are **curly "typographic" quotes**, not straight "dumb" quotes — and the same goes for the **curly apostrophe** (it\'s, don\'t). Don\'t forget **orphaned short words** either: a short word (a preposition, "a", "I") shouldn\'t be left at the end of a line — it\'s moved to the next word with a non-breaking space.',
    '**Trim zone** — the empty font field above and below the letters. A normal text block has extra font space; the `text-box-trim` function shaves it off so spacing is measured from the letters themselves, not from the invisible line box.',
  ],
  examples: [
    { kind: 'bad', caption: 'A large heading with line-height 1.6 — the lines drift apart', visual: 'hierarchy-bad' },
    { kind: 'good', caption: 'The same heading with line-height 1.15 — tight and collected', visual: 'hierarchy-good' },
  ],
  exercises: [
    {
      id: 'mt-choose-1',
      type: 'choose',
      picker: 'segmented',
      prompt: 'A 32px heading. Which relative line-height fits better?',
      options: [
        { id: 'a', label: '1.1', },
        { id: 'b', label: '1.5', hint: '1.5 is for small text; on a large heading the lines will drift apart.' },
        { id: 'c', label: '1.8', hint: 'Too much even for a paragraph, let alone a heading.' },
      ],
      correctOptionId: 'a',
      explanation:
        'The larger the font size, the less relative line-height you need. For 32px ~1.1–1.2 is enough: the letters are already large, and extra air between lines only tears the heading apart.',
    },
    {
      id: 'mt-choose-2',
      type: 'choose',
      prompt: 'Body text at 14px. Which line-height gives comfortable reading by the "+2–4px" rule?',
      options: [
        { id: 'a', label: '14px (1.0)', hint: 'The lines stick together — no air between them.' },
        { id: 'b', label: '17px (~1.2)', },
        { id: 'c', label: '28px (2.0)', hint: 'Double — the paragraph falls apart into separate lines.' },
        { id: 'd', label: '12px (0.85)', hint: 'Less than the font size — the lines overlap.' },
      ],
      correctOptionId: 'b',
      explanation:
        '14px + ~3px = 17px (about 1.2). For paragraph body you often go higher too (1.4–1.5), but the "+2–4px" addition is a reliable starting point tied to the font size, not to a random percentage.',
    },
    {
      id: 'mt-choose-3',
      type: 'choose',
      prompt: 'Where do you NEED an em dash (—) rather than a hyphen (-)?',
      options: [
        { id: 'a', label: 'a well-known fact', hint: 'This is a hyphen: it joins parts of a word.' },
        { id: 'b', label: 'the sign-in page', hint: 'This is a hyphen — part of a compound word.' },
        { id: 'c', label: 'Design — it\'s solving problems' },
        { id: 'd', label: 'a blue-green flag', hint: 'A compound adjective takes a hyphen.' },
      ],
      correctOptionId: 'c',
      explanation:
        'The em dash (—) separates parts of a sentence and is set with spaces on both sides. The hyphen (-) is a spelling mark inside a word: "well-known", "sign-in", "blue-green".',
    },
    {
      id: 'mt-match-1',
      type: 'match',
      prompt: 'Match each typographic mark with its correct use.',
      pairs: [
        { id: 'hyphen', left: '- (hyphen)', right: 'well-known, sign-in' },
        { id: 'dash', left: '— (em dash)', right: 'Design — a system' },
        { id: 'quotes', left: '"curly quotes"', right: 'typographic quotes' },
        { id: 'yo', left: '’ (curly apostrophe)', right: 'it’s, don’t' },
      ],
      explanation:
        'Each mark has its own role: the hyphen goes inside a word, the em dash between parts of a phrase, curly quotes are the proper typographic quotes, and the curly apostrophe — not the straight one — belongs in correct text.',
    },
    {
      id: 'mt-choose-4',
      type: 'choose',
      prompt: 'A line ends with a short word: "…we were talking about " and then a break. What\'s correct?',
      options: [
        { id: 'a', label: 'Leave the short word at the end of the line', hint: 'That\'s exactly an orphaned word — it\'s avoided.' },
        { id: 'b', label: 'Move the short word to the next word with a non-breaking space' },
        { id: 'c', label: 'Break the word after it with a hyphen', hint: 'Hyphenating the word has nothing to do with it.' },
        { id: 'd', label: 'Nothing, it doesn\'t matter', hint: 'An orphaned word gives away sloppy layout.' },
      ],
      correctOptionId: 'b',
      explanation:
        'Short words (prepositions, conjunctions, "a", "I") aren\'t left at the end of a line. They\'re "glued" to the next word with a non-breaking space (nbsp) so they wrap together.',
    },
    {
      id: 'mt-trim-1',
      type: 'trim-zone',
      prompt:
        'The "Submit" button has extra font field above and below (the trim zone). Trim it until the text sits optically centered — but don\'t cut into the letters themselves.',
      label: 'Submit',
      targetTrim: 9,
      maxTrim: 18,
      tolerance: 1,
      explanation:
        'The pink strips are the invisible trim zone (extra font space) above and below the letters. Shaving it off (as `text-box-trim` does) equates the spacing to the glyphs themselves, and padding starts to count from the letters. Overdoing it cuts into the letters — the sweet spot is exactly where the strips disappear.',
    },
  ],
  masteryChallenge: {
    id: 'mt-choose-5',
    type: 'choose',
    prompt:
      'The "Submit" button has noticeable vertical slack above and below the text, even though padding is set symmetrically. What\'s the cause and the fix?',
    options: [
      {
        id: 'a',
        label: 'It\'s extra font space (trim zone); shave it with text-box-trim',
      },
      { id: 'b', label: 'The padding is set wrong — increase it', hint: 'The padding is actually symmetric; the extra gap comes from the font itself.' },
      { id: 'c', label: 'It\'s the button\'s line-height', hint: 'It\'s not about one line\'s line-height, but the font\'s invisible field.' },
      { id: 'd', label: 'You need to change the font', hint: 'Every font has a trim zone — you shave it off, not swap the typeface.' },
    ],
    correctOptionId: 'a',
    explanation:
      'There\'s an invisible trim zone (extra font space) around the glyphs. The spacing from the line box visually "doesn\'t equal" the spacing from the letters themselves. `text-box-trim` shaves off that field, and padding starts to count from the letters — the button looks optically dialed in.',
  },
};
