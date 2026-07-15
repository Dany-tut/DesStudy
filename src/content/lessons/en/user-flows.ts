import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — user flows series, part 1 of 3.
 * The happy path: the shortest route to the goal, and why every extra step costs.
 */
export const userFlowsEn: Lesson = {
  id: 'user-flows',
  slug: 'user-flows',
  title: 'Flows: the happy path',
  pathTitle: 'UX Foundations',
  skill: 'flows',
  difficulty: 'medium',
  estimatedMinutes: 10,
  objectives: [
    'Tell the happy path apart from the side branches of a scenario',
    'Spot where an extra step increases drop-off',
    'Build a path to the goal in the fewest steps',
  ],
  prerequisites: ['ux-heuristics'],
  theory: [
    'The first of three lessons on **flows**. A user flow is the path from entry point to goal: screens, decisions, transitions.',
    'You draw the **happy path** first — the shortest route to success, where everything goes as planned, with no errors. It is the baseline scenario you later branch off to handle failures.',
    'Every extra **required** step is a drop-off point. Signing up before buying, an unnecessary confirmation, a 12-field form instead of 4 — all of it loses people before they reach the goal.',
    'The rule: strip out of the happy path everything you can defer or make optional without losing the function itself.',
  ],
  examples: [
    {
      kind: 'bad',
      caption: 'Mandatory sign-up before viewing the cart — a dead end for guests',
      visual: 'status-bad',
    },
    {
      kind: 'good',
      caption: 'Guest checkout: shorter path, account optional after payment',
      visual: 'status-good',
    },
  ],
  exercises: [
    {
      id: 'uf-choose-1',
      type: 'choose',
      prompt: 'What is the happy path?',
      options: [
        { id: 'a', label: 'The shortest route to the goal with no errors' },
        { id: 'b', label: 'A screen with a success animation', hint: 'That is part of the UI, not the structure of the scenario.' },
        { id: 'c', label: 'A list of every possible error', hint: 'Those are more like edge cases — the opposite of the happy path.' },
        { id: 'd', label: "The app's home screen", hint: 'The happy path is about the scenario, not a specific screen.' },
      ],
      correctOptionId: 'a',
      explanation:
        'The happy path is the baseline scenario where everything goes as planned: the person reaches the goal in the fewest steps and with no errors. Branches and failure handling are built off of it.',
    },
    {
      id: 'uf-order-1',
      type: 'order',
      prompt: 'Assemble the happy path of a guest checkout in the right order.',
      items: [
        { id: 'cart', label: 'Cart: review the order contents', size: 'body' },
        { id: 'address', label: 'Delivery address', size: 'body' },
        { id: 'payment', label: 'Payment', size: 'body' },
        { id: 'confirm', label: 'Order confirmation', size: 'title' },
      ],
      correctOrder: ['cart', 'address', 'payment', 'confirm'],
      explanation:
        'The flow goes from reviewing the order to the data needed to fulfil it (address → payment), and ends with confirmation — the point where the person\'s goal is reached.',
    },
    {
      id: 'uf-choose-2',
      type: 'choose',
      prompt: 'Which change reduces checkout drop-off the most?',
      options: [
        { id: 'a', label: 'Add another screen with terms of use', hint: 'An extra required step raises drop-off, not lowers it.' },
        { id: 'b', label: 'Make account creation optional, after payment' },
        { id: 'c', label: 'Enlarge the logo in the header', hint: 'That changes nothing in the flow itself.' },
        { id: 'd', label: 'Require phone and email on one screen', hint: 'One required field beats two when the goal is to cut friction.' },
      ],
      correctOptionId: 'b',
      explanation:
        'Mandatory sign-up is a common reason people leave right at the doorstep of a purchase. Moving it after payment removes a step from the happy path without losing the account function itself.',
    },
  ],
  masteryChallenge: {
    id: 'uf-choose-mastery',
    type: 'choose',
    prompt:
      'Order flow: Cart → Sign-up → Confirm email → Address → Payment → Done. Which step do you remove from the happy path first?',
    options: [
      { id: 'a', label: 'Sign-up with email confirmation — move it after payment' },
      { id: 'b', label: 'The address screen', hint: 'The address is needed for delivery — it is part of the goal, not an extra step.' },
      { id: 'c', label: 'The payment screen', hint: 'Without payment the order cannot complete — it is the core of the flow.' },
      { id: 'd', label: 'The cart screen', hint: 'Reviewing the order contents is a useful step before payment.' },
    ],
    correctOptionId: 'a',
    explanation:
      'Sign-up and email confirmation are two required steps not needed for the purchase itself. They get moved out of the happy path (the account can be created after payment). Address, payment, and cart are part of the goal — you cannot remove them.',
  },
};
