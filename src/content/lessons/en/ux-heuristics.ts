import type { Lesson } from '@/lib/curriculum/types';
import { premiumCardCritique } from '@/lib/curriculum/screenCritique';

/**
 * UX Foundations — Nielsen's heuristics, part 1 of 4.
 * Feedback: visibility of system status (#1) + help users recognise, diagnose
 * and recover from errors (#9).
 */
export const uxHeuristicsEn: Lesson = {
  id: 'ux-heuristics',
  slug: 'ux-heuristics',
  title: 'Heuristics: Feedback',
  pathTitle: 'UX Foundations',
  skill: 'ux',
  difficulty: 'easy',
  estimatedMinutes: 10,
  objectives: [
    'Always show system status after an action',
    'Tell a good error message from a useless one',
    'Build an error message as: what → why → how to fix',
  ],
  prerequisites: [],
  theory: [
    '**Nielsen\'s heuristics** — 10 basic usability rules. This is the first of four lessons, and it\'s about **feedback**: the system always responds to a user\'s action.',
    '**Visibility of system status** (#1): after any action a person should see what\'s happening — a load is running, everything saved, an error occurred. Silence after a click breeds anxiety and repeated taps.',
    '**Help recognize and recover from errors** (#9): say *what* is wrong, *why*, and *how* to fix it — in plain language, no codes. "Error 0xE4A1" doesn\'t help; "Your card was declined by the bank — check the details or use another one" does.',
    'Good feedback is **proportionate**: a small action gets a quiet response (a checkmark), an important or long one gets a noticeable one (progress, a toast, a banner).',
  ],
  examples: [
    { kind: 'bad', caption: 'Button pressed — and silence, the status is unclear', visual: 'status-bad' },
    { kind: 'good', caption: 'The status is visible: "Saving…"', visual: 'status-good' },
  ],
  exercises: [
    premiumCardCritique('ux-screen-critique-1'),
    {
      id: 'ux-fb-choose-1',
      type: 'choose',
      prompt:
        'A user tapped "Pay," but for several seconds nothing changes. Which heuristic is violated?',
      options: [
        { id: 'a', label: 'Visibility of system status' },
        { id: 'b', label: 'Aesthetic and minimalist design', hint: 'It\'s not about looks, it\'s about feedback.' },
        { id: 'c', label: 'User control and freedom', hint: 'Undo is about something else.' },
        { id: 'd', label: 'Help and documentation', hint: 'What\'s needed here is an indicator, not help docs.' },
      ],
      correctOptionId: 'a',
      explanation:
        'The system should show status: a spinner, "Processing payment…". Silence after an action violates visibility of status and leaves the user guessing — did it go through, should I tap again?',
    },
    {
      id: 'ux-fb-choose-2',
      type: 'choose',
      prompt: 'What makes an error message good?',
      options: [
        { id: 'a', label: 'Error code 0xE4A1', hint: 'Codes say nothing to the user.' },
        { id: 'b', label: '"Something went wrong"', hint: 'Doesn\'t explain the cause or the fix.' },
        { id: 'c', label: 'The cause + how to fix it' },
        { id: 'd', label: 'Just the color red', hint: 'Color is a signal, but not an explanation.' },
      ],
      correctOptionId: 'c',
      explanation:
        'A good error speaks in plain language: what happened, why, and what to do. For example: "Your card was declined by the bank. Check the details or use another card."',
    },
    {
      id: 'ux-fb-match',
      type: 'match',
      prompt: 'Match the situation to the right feedback.',
      pairs: [
        { id: 'p1', left: 'Data is loading', right: 'Skeletons or a spinner' },
        { id: 'p2', left: 'Form submitted successfully', right: '"Done ✓" + the next step' },
        { id: 'p3', left: 'Save failed due to the network', right: 'The cause + a "Retry" button' },
      ],
      explanation:
        'Every system state should have a visible response: waiting — an indicator, success — confirmation, error — the cause and a path to a fix.',
    },
  ],
  masteryChallenge: {
    id: 'ux-fb-order',
    type: 'order',
    prompt: 'Assemble an error message — from the most important to the least.',
    items: [
      { id: 'code', label: 'Code: PAYMENT_DECLINED_051', size: 'caption' },
      { id: 'title', label: 'Payment failed', size: 'title' },
      { id: 'fix', label: 'Retry payment', size: 'button' },
      { id: 'why', label: 'The bank declined the card — check the details', size: 'body' },
    ],
    correctOrder: ['title', 'why', 'fix', 'code'],
    explanation:
      'First the gist ("Payment failed"), then the cause, then the action to fix it, and at the very bottom the technical code for support.',
  },
};
