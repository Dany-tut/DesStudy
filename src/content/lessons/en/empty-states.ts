import type { Lesson } from '@/lib/curriculum/types';

/** UX Foundations — empty states: the screen isn't "nothing", it's a message + a next step. */
export const emptyStatesEn: Lesson = {
  id: 'empty-states',
  slug: 'empty-states',
  title: 'Empty states and onboarding',
  pathTitle: 'UX Foundations',
  skill: 'empty-states',
  difficulty: 'medium',
  estimatedMinutes: 10,
  objectives: [
    'Tell apart three reasons a screen is empty and match a message to each',
    'Use an empty state as a chance to explain value and offer an action',
    'Know when a contextual tip works better than a separate onboarding tour',
  ],
  prerequisites: ['forms'],
  theory: [
    '**An empty state is a screen of its own**, not "nothing to show". A bare "No data" leaves the person with no idea what to do next.',
    'The reasons for emptiness differ, and each has its own message: **nothing created yet** (needs a "create your first" CTA), **nothing found** by a filter/search (needs a way to clear the conditions), **loading error** (needs a "retry" button). The same text for all three confuses.',
    'Onboarding works best **built into the moment it\'s needed** — a short tip next to an element the first time the person reaches it, not a 5-screen tour before they\'ve even seen the product.',
  ],
  examples: [
    {
      kind: 'bad',
      caption: '"No data" — no explanation and no action',
      visual: 'empty-bad',
    },
    {
      kind: 'good',
      caption: 'Icon + explanation of value + action button',
      visual: 'empty-good',
    },
  ],
  exercises: [
    {
      id: 'es-choose-1',
      type: 'choose',
      prompt:
        'A user opened the "Projects" section for the first time — they haven\'t created anything yet. What should be on the screen?',
      options: [
        {
          id: 'a',
          label: 'Just a blank white screen',
          hint: 'No explanation and no next step.',
        },
        {
          id: 'b',
          label: 'The text "No data" with no explanation',
          hint: "Doesn't explain what to do next.",
        },
        {
          id: 'c',
          label: 'Icon + explanation of the section\'s value + a "Create your first project" button',
        },
        {
          id: 'd',
          label: 'An instant redirect to the create form with no explanation',
          hint: "Too abrupt — the person hasn't grasped where they are or why.",
        },
      ],
      correctOptionId: 'c',
      explanation:
        'For the "nothing created yet" case, the empty state is a chance to explain the section\'s value and immediately offer the most logical action: create the first record.',
    },
    {
      id: 'es-choose-2',
      type: 'choose',
      prompt: "A catalog search found nothing for the user's query. Which message fits?",
      options: [
        {
          id: 'a',
          label: '"Nothing found" + an offer to change the query or clear filters',
        },
        {
          id: 'b',
          label: 'The same screen as for "no data at all yet"',
          hint: 'Different reasons for emptiness need different messages and different actions.',
        },
        {
          id: 'c',
          label: 'A redirect to the home page with no explanation',
          hint: 'Loses the query context — the person has to search again from scratch.',
        },
        {
          id: 'd',
          label: 'An endless loading spinner',
          hint: "This isn't an empty state, it's a bug — search should end with a result or the lack of one.",
        },
      ],
      correctOptionId: 'a',
      explanation:
        '"Nothing found" is not the same as "no data yet": the person already knows the catalog isn\'t empty, they need a way to fix the query, not a "create" CTA.',
    },
    {
      id: 'es-choose-3',
      type: 'choose',
      prompt:
        'When does an onboarding tour (several screens in a row before you start working) work worse than contextual tips?',
      options: [
        {
          id: 'a',
          label: 'When the user hasn\'t seen a single real product screen yet',
        },
        {
          id: 'b',
          label: 'When the product has more than one feature',
          hint: "The number of features alone doesn't decide which onboarding format is better.",
        },
        {
          id: 'c',
          label: 'When the screen contains a form',
          hint: "The screen type doesn't decide the onboarding format.",
        },
        {
          id: 'd',
          label: 'When the product has a dark theme',
          hint: 'The color theme has nothing to do with choosing an onboarding format.',
        },
      ],
      correctOptionId: 'a',
      explanation:
        'A tour of abstract slides before the first real screen is poorly remembered — there\'s nothing to project it onto. A tip shown right at the element, at the moment it\'s needed, is tied to context and so sticks better.',
    },
  ],
  masteryChallenge: {
    id: 'es-figma-1',
    type: 'figma-link',
    prompt:
      'Design three states of the same list in Figma: a normal list with data, "no data yet", and "nothing found for the query". The shared layout should be recognizable across all three.',
    checklist: [
      'There\'s a separate design for "no data yet" with an explanation and a create CTA',
      'There\'s a separate design for "nothing found" with a way to clear/change the query',
      'All three states clearly belong to the same screen',
    ],
    explanation:
      'Three different empty states for one list show that the designer thought through not only the happy path with data, but both kinds of "empty" — with different messages for different reasons.',
  },
};
