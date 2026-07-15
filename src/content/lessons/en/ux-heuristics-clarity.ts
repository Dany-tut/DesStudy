import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — Nielsen's heuristics, part 3 of 4.
 * Match between system and the real world (#2) + recognition rather than
 * recall (#6) + help and documentation (#10).
 */
export const uxHeuristicsClarityEn: Lesson = {
  id: 'ux-heuristics-clarity',
  slug: 'ux-heuristics-clarity',
  title: 'Heuristics: Clarity and Language',
  pathTitle: 'UX Foundations',
  skill: 'ux',
  difficulty: 'easy',
  estimatedMinutes: 10,
  objectives: [
    'Speak the user\'s language, not system terms',
    'Show options instead of forcing people to remember',
    'Offer help in context and to the point',
  ],
  prerequisites: ['ux-heuristics'],
  theory: [
    'The third lesson is about **clarity**: does the person understand what they see, without a dictionary and without straining their memory?',
    '**Match between system and the real world** (#2): speak in the user\'s words and concepts, not the system\'s. "Authentication failed" → "Wrong password." Familiar metaphors and a natural order instead of technical jargon.',
    '**Recognition rather than recall** (#6): don\'t make people hold information in their heads. Show options, recent items, autocomplete — recognizing from a list is easier than remembering and typing by hand.',
    '**Help and documentation** (#10): ideally the product is clear without help. But if help is needed, keep it close by, in the context of the task, short, and with concrete steps.',
  ],
  examples: [],
  exercises: [
    {
      id: 'ux-clr-choose-1',
      type: 'choose',
      prompt: 'Which message matches the user\'s language rather than the system\'s?',
      options: [
        { id: 'a', label: '"Wrong password. Try again or recover your access"' },
        {
          id: 'b',
          label: '"Authentication error: HTTP 401 Unauthorized"',
          hint: 'This is the system\'s language — codes and terms the user won\'t get.',
        },
        {
          id: 'c',
          label: '"Exception: invalid credentials"',
          hint: 'Technical jargon, and not in the user\'s language either.',
        },
        { id: 'd', label: '"Access denied (0x0005)"', hint: 'A code instead of a human explanation.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Match with the real world: speak in the user\'s concepts. "Wrong password" they\'ll get instantly, whereas "401 Unauthorized" is the system\'s internal language.',
    },
    {
      id: 'ux-clr-choose-2',
      type: 'choose',
      prompt:
        'A user is selecting a country. What relies on recognition rather than recall?',
      options: [
        { id: 'a', label: 'A dropdown of countries with search' },
        {
          id: 'b',
          label: 'A field "Enter the country code (ISO)"',
          hint: 'Forces you to recall the code by heart — that\'s recall.',
        },
        {
          id: 'c',
          label: 'An empty "Country" field with no hints',
          hint: 'No support for memory — recall again.',
        },
        {
          id: 'd',
          label: 'Instructions in the help docs on how to write the name',
          hint: 'Shifts the work onto memory and onto reading help docs.',
        },
      ],
      correctOptionId: 'a',
      explanation:
        'Recognition rather than recall: seeing and picking from a list is easier than remembering the exact name or code. Show options, autocomplete, recent items — take the load off memory.',
    },
    {
      id: 'ux-clr-match',
      type: 'match',
      prompt: 'Translate the system text into the user\'s language.',
      pairs: [
        { id: 'p1', left: 'Error 404', right: 'Page not found' },
        { id: 'p2', left: 'Submit', right: 'Send' },
        { id: 'p3', left: 'Invalid input', right: 'Check how the field is filled in' },
      ],
      explanation:
        'The interface should speak in the user\'s concepts. Replace codes and techy English words with clear phrasing that says right away what happened and what to do.',
    },
  ],
  masteryChallenge: {
    id: 'ux-clr-choose-mastery',
    type: 'choose',
    prompt:
      'Where is help for a complicated "Tax ID" field most useful under heuristic #10?',
    options: [
      {
        id: 'a',
        label: 'A "?" hint next to the field — with an example and the length',
      },
      {
        id: 'b',
        label: 'A separate "Help" section in the menu',
        hint: 'Far from the task — you\'d have to leave and search; help out of context.',
      },
      {
        id: 'c',
        label: 'A 20-page PDF manual',
        hint: 'Long and off-point; nobody reads that kind of help in the moment.',
      },
      {
        id: 'd',
        label: 'No help at all — let them figure it out',
        hint: 'A complex field with no support raises the number of errors.',
      },
    ],
    correctOptionId: 'a',
    explanation:
      'Help is most useful in the context of the task, short and specific: a hint right by the field, with an example and the required length, helps at the moment the question comes up — without making you leave the page.',
  },
};
