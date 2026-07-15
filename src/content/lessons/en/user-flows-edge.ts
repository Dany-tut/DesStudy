import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — user flows series, part 2 of 3.
 * Branches and edge cases: errors, empty/loading/offline states as part of the
 * flow, and always giving a path back.
 */
export const userFlowsEdgeEn: Lesson = {
  id: 'user-flows-edge',
  slug: 'user-flows-edge',
  title: 'Flows: branches and edge cases',
  pathTitle: 'UX Foundations',
  skill: 'flows',
  difficulty: 'medium',
  estimatedMinutes: 11,
  objectives: [
    'Plan for errors and empty states in the flow up front',
    'Pick the right state for each situation',
    'Give a way out of every error branch instead of a dead end',
  ],
  prerequisites: ['user-flows'],
  theory: [
    'The happy path is only half the flow. A real scenario **branches**: something is not found, payment is declined, the network drops. The second lesson is about these branches.',
    '**Edge cases** are planned up front, not "when we get around to it." An empty cart, a declined payment, no network, no search results — these are all states the person will definitely see.',
    'Every situation gets its own **state**: waiting → a loading indicator, empty → an empty state with a hint, failure → an error with a reason. A blank white screen is not "no data," it is "the designer forgot."',
    'An error branch always **leads somewhere**: a reason plus an action to recover. A dead end with nowhere to go is the worst outcome of a flow.',
  ],
  examples: [
    { kind: 'bad', caption: 'A blank screen with no explanation and no action', visual: 'empty-bad' },
    { kind: 'good', caption: 'Empty state: what happened and what to do', visual: 'empty-good' },
  ],
  exercises: [
    {
      id: 'ufe-choose-1',
      type: 'choose',
      prompt: 'What is an edge case in a flow?',
      options: [
        { id: 'a', label: 'A situation outside the happy path: an error, emptiness, a failure' },
        { id: 'b', label: 'A nicely designed success screen', hint: 'Success is the happy path, not an edge case.' },
        { id: 'c', label: 'A button at the edge of the screen', hint: 'This is about the scenario, not the placement of an element.' },
        { id: 'd', label: "The user's most common path", hint: 'The common path is exactly the happy path.' },
      ],
      correctOptionId: 'a',
      explanation:
        'An edge case is anything that deviates from the ideal scenario: a network failure, an empty list, a declined payment. You plan for these branches up front, because the user will definitely run into them.',
    },
    {
      id: 'ufe-match',
      type: 'match',
      prompt: 'Match the situation with the state you should show.',
      pairs: [
        { id: 'p1', left: 'The list is still loading', right: 'Skeletons / indicator' },
        { id: 'p2', left: 'The search found nothing', right: 'Empty state with a hint' },
        { id: 'p3', left: 'The network dropped', right: 'Banner + "Retry" button' },
      ],
      explanation:
        'Each branch gets its own state: waiting shows an indicator, emptiness explains and suggests a next step, failure names the reason and lets you retry. That way the flow does not break off into a dead end.',
    },
    {
      id: 'ufe-choose-2',
      type: 'choose',
      prompt: 'The user searched for a product and there are no matches. What do you show?',
      options: [
        { id: 'a', label: 'Empty state: "Nothing found" + tips and a way to clear filters' },
        { id: 'b', label: 'A blank white screen', hint: 'Looks like a bug: unclear whether it broke or is really empty.' },
        { id: 'c', label: 'The previous results, as if nothing changed', hint: 'Misleading — the person will think the search did not work.' },
        { id: 'd', label: 'A "Something went wrong" error', hint: 'This is not a system error — there simply are no matches.' },
      ],
      correctOptionId: 'a',
      explanation:
        'No results is a normal branch, not a failure. A good empty state explains that there are no matches and suggests a way out: loosen the query, clear filters, look at something similar.',
    },
  ],
  masteryChallenge: {
    id: 'ufe-figma-1',
    type: 'figma-link',
    prompt:
      'Sketch a "Forgot password" flow in Figma: from clicking the link to a successful login with a new password. Mark the happy path and at least one error branch (for example, email not found).',
    checklist: [
      'The happy path is visible from entry point to success',
      'There is at least one error branch, not just the successful scenario',
      'The error branch leads to recovery, not a dead end',
      'It is marked where each button/link leads',
    ],
    explanation:
      'The "Forgot password" flow is short but has a mandatory error branch (email not found, link expired). A good diagram shows both sides: the happy path, and what happens — and where it leads — when something goes wrong.',
  },
};
