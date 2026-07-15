import type { Lesson } from '@/lib/curriculum/types';

/**
 * Design Process — Nielsen-style series, part 1 of 3.
 * The brief: framing the task (not the solution), constraints, success metrics.
 */
export const briefResearchEn: Lesson = {
  id: 'brief-research',
  slug: 'brief-research',
  title: 'Brief and goals',
  pathTitle: 'Design Process',
  skill: 'process',
  difficulty: 'easy',
  estimatedMinutes: 10,
  objectives: [
    'Tell the task apart from a ready-made solution in the brief',
    'Set measurable success criteria',
    'Capture constraints before the work starts',
  ],
  prerequisites: [],
  theory: [
    'The first lesson in the series about the **design process** — where a project begins before any pixels. And it begins with the **brief**.',
    "**A brief / spec** captures the task: who the user is, what problem they have, what the constraints are, and how we'll know it worked. It's the anchor you come back to for every decision.",
    '**Task ≠ solution.** A good brief describes the problem ("reduce cart abandonment"), not a ready-made answer ("make the button green"). How to solve it is design\'s job, and it shouldn\'t be baked into the framing.',
    '**Success criteria are measurable**, and **constraints** (deadlines, brand, tech, budget) are named honestly. A vague "we want it to look nice" and hidden constraints are the top causes of rework.',
  ],
  examples: [],
  exercises: [
    {
      id: 'br-choose-1',
      type: 'choose',
      prompt: 'Which of these is a good way to phrase something in a brief?',
      options: [
        { id: 'a', label: 'Reduce cart abandonment on mobile' },
        { id: 'b', label: 'Make the "Buy" button bigger and orange', hint: "That's a ready-made solution, not a task. The solution is design's job." },
        { id: 'c', label: 'We want it nice and modern', hint: 'Too vague: no user, no problem, no success criterion.' },
        { id: 'd', label: 'Redraw everything like competitor X', hint: "Copying isn't a task and doesn't guarantee a result." },
      ],
      correctOptionId: 'a',
      explanation:
        'A good brief states the task and a measurable goal ("reduce cart abandonment"), leaving the way to solve it to the designer. A ready-made solution in the brief ties your hands and often treats the symptom, not the cause.',
    },
    {
      id: 'br-choose-2',
      type: 'choose',
      prompt: 'Which success criterion works for a brief?',
      options: [
        { id: 'a', label: 'Checkout conversion rises from 2% to 3% this quarter' },
        { id: 'b', label: 'It becomes more convenient', hint: 'Unmeasurable — how do you tell the goal was reached?' },
        { id: 'c', label: 'The designer likes the result', hint: "The author's taste isn't a product success criterion." },
        { id: 'd', label: "It'll be like Apple", hint: "That's a reference, not a measurable goal." },
      ],
      correctOptionId: 'a',
      explanation:
        'A success criterion is measurable and time-bound: you can see a number, a deadline, and how to verify it. "It becomes more convenient" can\'t be confirmed or disproved — so it isn\'t a criterion.',
    },
    {
      id: 'br-match',
      type: 'match',
      prompt: 'Match the brief element with an example.',
      pairs: [
        { id: 'p1', left: 'Task', right: 'Reduce onboarding drop-off' },
        { id: 'p2', left: 'Success criterion', right: 'Completion rate +15%' },
        { id: 'p3', left: 'Constraint', right: 'Deadline — 2 weeks, brand colors' },
      ],
      explanation:
        'A brief rests on three pillars: what we\'re solving (the task), how we\'ll know we succeeded (a measurable criterion), and the limits we work within (constraints). Missing any one, and the project drifts.',
    },
  ],
  masteryChallenge: {
    id: 'br-choose-mastery',
    type: 'choose',
    prompt: 'The client sent four lines. Which one is a properly framed brief?',
    options: [
      {
        id: 'a',
        label: "New users don't understand where to start → we want 60% to reach their first action within a week",
      },
      {
        id: 'b',
        label: 'Add a big video banner to the home page',
        hint: 'A ready-made solution with no task or goal — risking treating the symptom.',
      },
      {
        id: 'c',
        label: 'Make it modern and premium',
        hint: 'No user, no problem, no measurable criterion.',
      },
      {
        id: 'd',
        label: "Copy the competitor's onboarding, but better",
        hint: "Copying isn't a task framing.",
      },
    ],
    correctOptionId: 'a',
    explanation:
      'A proper brief connects the user, the problem, and a measurable goal, leaving the way to solve it open. The other three are either a ready-made solution, vagueness, or copying — and with them design spirals into rework.',
  },
};
