import type { Lesson } from '@/lib/curriculum/types';

/**
 * Section intro lecture — broad and conceptual. Not a drill skill: it has no
 * exercises or mastery challenge, only slide sections to read. Frames the whole
 * section: design is a way of thinking, not "being good at Figma".
 */
export const designThinkingIntroEn: Lesson = {
  id: 'design-thinking-intro',
  slug: 'design-thinking-intro',
  title: 'Why a designer isn\'t just "someone who knows Figma"',
  pathTitle: 'UI Foundations',
  skill: 'design-thinking',
  kind: 'lecture',
  difficulty: 'intro',
  estimatedMinutes: 6,
  objectives: [
    'Understand that design is a way of thinking, not decoration',
    'See the shared principles of design beyond the screen',
    'Learn to notice design in everyday life',
  ],
  prerequisites: [],
  theory: [],
  sections: [
    {
      heading: 'Design is not a pretty picture',
      body: [
        'Design isn\'t a pretty picture, an app, or a button.',
        'It\'s a way of understanding **how an object, a space, a screen, human behavior, and the path of someone\'s attention are built**.',
      ],
      visual: 'da-beauty-vs-work',
    },
    {
      heading: 'The myth: design = making things look nice',
      body: [
        'Most people think design means picking a font, copying a screen from Pinterest, choosing a nice color, adding a shadow, doing the "glass" thing.',
        'A good designer doesn\'t ask "what color and font", but: **Why is this here? What matters most? Where will the person look first? What should they understand in 2 seconds? What\'s getting in their way? What should be removed, not added?**',
      ],
      visual: 'da-myths',
    },
    {
      heading: 'Design is organizing form, meaning, and behavior',
      body: ['Put simply, design is a way to:'],
      chips: [
        'organize information',
        'direct attention',
        'reduce chaos',
        'simplify an action',
        'make interaction clear',
      ],
    },
    {
      heading: 'Design wasn\'t born in Figma or Photoshop',
      body: [
        'Long before interfaces there was architecture, craft, signage, painting, print, book layout, the urban environment, product design.',
        'People have always solved the same problems: **how to guide a person through a space, what matters most here, how to make an object comfortable, how to express character.**',
        'So when we design a screen, we\'re not doing something brand new — we\'re continuing a very old story, just in a digital medium.',
      ],
      chips: [
        'architecture',
        'craft',
        'signage',
        'painting',
        'print',
        'book layout',
        'urban environment',
        'product design',
      ],
    },
    {
      heading: 'Architecture and interfaces share the same principles',
      body: [
        '**Rhythm** — repetition → cards / rows / blocks.',
        '**Axis** — direction → alignment line.',
        '**Focal point** — what matters most → CTA / hero banner / total.',
        '**Hierarchy** — what comes first, what comes second → heading → text → action.',
        '**Scale** — what\'s bigger and more important → the size of the main block.',
        '**Pauses** — emptiness, air → whitespace / spacing.',
      ],
    },
    {
      heading: 'Growth doesn\'t start when you start drawing',
      body: [
        'Becoming a designer takes more than opening Figma. You need to start seeing design in everyday life.',
        'Real growth begins when you start noticing: **where things are convenient, where they\'re not, where something is pretty but useless, where something is simple but very clever.**',
      ],
      chips: [
        'where it\'s convenient',
        'where it\'s inconvenient',
        'where it\'s pretty but useless',
        'where it\'s simple but very clever',
      ],
    },
    {
      heading: 'A trained eye is not a folder of pictures',
      body: [
        'Many people think a trained eye means saving 500 screenshots, hanging out on Pinterest, scrolling Dribbble.',
        'A truly trained eye is **the skill of seeing**: form, rhythm, color, logic, presentation, and behavior; spotting mistakes and patterns; understanding why something works; comparing solutions.',
      ],
      chips: [
        'seeing form, rhythm, color, logic',
        'seeing mistakes',
        'noticing patterns',
        'understanding why something works',
        'comparing solutions',
      ],
    },
    {
      heading: 'Not "like / dislike", but "why it works"',
      body: [
        'A beginner says: "I like it", "cool", "pretty", "feels empty", "kind of boring".',
        'A designer names the **reason**: weak hierarchy, confusing navigation, an overloaded first screen, weak typographic structure, too many competing accents, poor contrast, no focal point.',
      ],
      chips: [
        'weak hierarchy',
        'confusing navigation',
        'overloaded first screen',
        'weak typographic structure',
        'many competing accents',
        'poor contrast',
        'no focal point',
      ],
      visual: 'da-first-look',
    },
    {
      heading: 'Without a proper brief a designer works into the void',
      body: [
        'A brief is the answers to questions **before you start drawing**:',
      ],
      chips: [
        'what we\'re making',
        'for whom',
        'why',
        'what problem we\'re solving',
        'what action the user should take',
        'what constraints there are',
        'what absolutely must be there',
        'what must not be done',
        'who the competitors are',
        'what counts as a good result',
      ],
    },
    {
      heading: 'No brief — a designer doesn\'t design, they guess',
      body: [
        'If those answers are missing, the designer isn\'t designing — they\'re **guessing**.',
        'Drawing without a brief is like building a house when all you\'ve been told is "I want it to look nice".',
      ],
    },
  ],
  examples: [],
  exercises: [],
};
