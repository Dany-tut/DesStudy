import type { Lesson } from '@/lib/curriculum/types';

/**
 * Design Process — series part 2 of 3.
 * Research methods: interviews, surveys, competitor analysis, analytics — and
 * matching the method to the question (qualitative "why" vs quantitative "how many").
 */
export const researchMethodsEn: Lesson = {
  id: 'research-methods',
  slug: 'research-methods',
  title: 'Research methods',
  pathTitle: 'Design Process',
  skill: 'process',
  difficulty: 'easy',
  estimatedMinutes: 11,
  objectives: [
    'Pick the method for the question: "why" or "how many"',
    'Turn competitor analysis into conclusions, not screenshots',
    'Tell qualitative and quantitative data apart',
  ],
  prerequisites: ['brief-research'],
  theory: [
    'The brief posed the question — research answers it **with data**, not with taste. The second lesson in the series is about which method gets you the answer you need.',
    '**Qualitative vs quantitative.** Qualitative (interviews, observation) answer **"why"** and uncover causes; quantitative (surveys, analytics) answer **"how many / how often"** and give scale. You pick the method for the question, not the other way around.',
    '**Competitor analysis** is a source of patterns (what has become standard and isn\'t worth reinventing) and gaps (what\'s solved poorly — a place to step in). The output is conclusions, not a folder of screenshots.',
    "**Analytics** show what people **actually do**, not what they say. Words and behavior diverge — which is why strong research usually combines several methods.",
  ],
  examples: [],
  exercises: [
    {
      id: 'rm-choose-1',
      type: 'choose',
      prompt: 'Why analyze competitors before designing?',
      options: [
        { id: 'a', label: 'To find working patterns and unfilled gaps' },
        { id: 'b', label: 'To copy the best screen', hint: "A copy of someone else's solution ignores your task and your user." },
        { id: 'c', label: 'To make sure the market is empty', hint: 'Even a crowded market leaves gaps — those are what we look for.' },
        { id: 'd', label: "It's a formality for the report", hint: 'Analysis should yield conclusions, not a line in a deck.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Competitor analysis is a source of patterns (what has become standard and isn\'t worth reinventing) and gaps (what\'s solved poorly — a place to step in). The output of the analysis is conclusions, not screenshots for show.',
    },
    {
      id: 'rm-choose-2',
      type: 'choose',
      prompt:
        'You need to understand WHY people abandon the cart at the payment step. Which method gives the answer?',
      options: [
        { id: 'a', label: 'In-depth interviews with people who abandoned the cart' },
        {
          id: 'b',
          label: 'A "rate the convenience from 1 to 5" survey',
          hint: 'Gives a number, but not the cause — you can\'t uncover "why" that way.',
        },
        {
          id: 'c',
          label: 'Only the funnel numbers in analytics',
          hint: 'Shows WHERE they drop off, but not WHY.',
        },
        {
          id: 'd',
          label: 'Ask the team for their opinion at a standup',
          hint: "That's the team's guesses, not data about users.",
        },
      ],
      correctOptionId: 'a',
      explanation:
        'A "why" question is qualitative. An interview uncovers the causes: hidden fees, distrust of the payment, a confusing step. Analytics will show where they drop off, but a conversation gives the reason.',
    },
    {
      id: 'rm-match',
      type: 'match',
      prompt: 'Match the method with the question it answers.',
      pairs: [
        { id: 'p1', left: 'In-depth interview', right: 'Why it happens' },
        { id: 'p2', left: 'Survey', right: 'How often and for how many' },
        { id: 'p3', left: 'Product analytics', right: 'What they actually do' },
      ],
      explanation:
        'Each method is strong at its own question: interviews — about causes, surveys — about scale, analytics — about real behavior. Strong research combines them rather than relying on one.',
    },
  ],
  masteryChallenge: {
    id: 'rm-choose-mastery',
    type: 'choose',
    prompt:
      'Hypothesis: "the new feature goes unnoticed". You need to quickly gauge the scale — for how many users this is true. Where do you start?',
    options: [
      {
        id: 'a',
        label: 'Check analytics: how many people opened the feature at all',
      },
      {
        id: 'b',
        label: 'Run 5 in-depth interviews',
        hint: 'Interviews will reveal "why", but not the "for how many" scale.',
      },
      {
        id: 'c',
        label: 'Ask stakeholders for their opinion',
        hint: 'An opinion is not data about user behavior.',
      },
      {
        id: 'd',
        label: 'Just redo the feature right away',
        hint: 'Acting before measuring scale risks treating a problem that isn\'t there.',
      },
    ],
    correctOptionId: 'a',
    explanation:
      'A "for how many" question is quantitative, and analytics answers it fastest: you can see reach and frequency. Then interviews can explain "why it goes unnoticed". Scale first — then causes.',
  },
};
