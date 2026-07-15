import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — Nielsen's heuristics, part 2 of 4.
 * User control and freedom (#3) + error prevention (#5).
 */
export const uxHeuristicsControlEn: Lesson = {
  id: 'ux-heuristics-control',
  slug: 'ux-heuristics-control',
  title: 'Heuristics: Control and Prevention',
  pathTitle: 'UX Foundations',
  skill: 'ux',
  difficulty: 'easy',
  estimatedMinutes: 10,
  objectives: [
    'Give clear exits and undo instead of irreversible actions',
    'Prevent an error before it ever happens',
    'Choose "Undo" over needless confirmations',
  ],
  prerequisites: ['ux-heuristics'],
  theory: [
    'The second heuristics lesson is about who holds **control**, and about keeping the user from making a mistake in the first place.',
    '**User control and freedom** (#3): a person should always have a clear way out — undo, a step back, an emergency exit from a mode. Irreversibility is scary; **Undo** is almost always better than "are you sure?".',
    '**Error prevention** (#5): the best error is the one that never happened. Remove the chance to err up front: sensible defaults, input constraints (a date picker instead of a free-text string), confirmation only for the truly dangerous.',
    'Rule of thumb: for **frequent** actions — a gentle undo after the fact ("Email deleted · Undo"); a modal "Are you sure?" on every little thing and people stop reading it.',
  ],
  examples: [
    { kind: 'bad', caption: 'Free-text input — easy to get the format wrong', visual: 'form-bad' },
    { kind: 'good', caption: 'Hints and constraints keep you from erring', visual: 'form-good' },
  ],
  exercises: [
    {
      id: 'ux-ctl-choose-1',
      type: 'choose',
      prompt:
        'A user deletes emails often and sometimes by accident. Which pattern is friendlier?',
      options: [
        { id: 'a', label: 'A toast: "Email deleted · Undo"' },
        {
          id: 'b',
          label: 'A modal "Are you sure?" on every delete',
          hint: 'For a frequent action this is annoying, and people stop reading it.',
        },
        {
          id: 'c',
          label: 'Delete silently, with no way to get it back',
          hint: 'That\'s irreversibility — the opposite of user freedom.',
        },
        {
          id: 'd',
          label: 'Hide the "Delete" button deeper',
          hint: 'That complicates a frequent action instead of guarding against a mistake.',
        },
      ],
      correctOptionId: 'a',
      explanation:
        'For frequent actions, undo after the fact keeps both speed and freedom: it doesn\'t get in the way 99% of the time and saves you the other 1%. Modal confirmations on a frequent action quickly become a "blind" click.',
    },
    {
      id: 'ux-ctl-choose-2',
      type: 'choose',
      prompt: 'What\'s the best way to prevent an error in a "Date of birth" field?',
      options: [
        { id: 'a', label: 'A calendar / input mask with validation' },
        {
          id: 'b',
          label: 'A free-text field',
          hint: 'Everyone types it their own way — 01.02, Feb 1, 2000-02-01. A source of errors.',
        },
        {
          id: 'c',
          label: 'Show an error after the form is submitted',
          hint: 'That\'s already curing the error, not preventing it.',
        },
        {
          id: 'd',
          label: 'Write the required format in the help docs',
          hint: 'Help docs go unread; better to design the field so you can\'t err.',
        },
      ],
      correctOptionId: 'a',
      explanation:
        'Error prevention is about design: a calendar or a mask physically won\'t let you enter the wrong format. That\'s more reliable than catching the error after the fact or hoping for the help docs.',
    },
    {
      id: 'ux-ctl-match',
      type: 'match',
      prompt: 'Match the technique to the problem it solves.',
      pairs: [
        { id: 'p1', left: 'An "Undo" button in a toast', right: 'User freedom' },
        { id: 'p2', left: 'A default value in a field', right: 'Error prevention' },
        { id: 'p3', left: 'Exit a mode with Esc', right: 'Emergency exit' },
      ],
      explanation:
        'User freedom lets you go back; prevention keeps you from erring in advance; an emergency exit gets you quickly out of a state you landed in by accident.',
    },
  ],
  masteryChallenge: {
    id: 'ux-ctl-choose-mastery',
    type: 'choose',
    prompt:
      'A dangerous, irreversible action — deleting an entire project. Which option protects best?',
    options: [
      {
        id: 'a',
        label: 'Ask the user to type the project name to confirm',
      },
      {
        id: 'b',
        label: 'A plain "Delete?" modal with a "Yes" button',
        hint: 'For a truly dangerous action this is too easy to confirm on autopilot.',
      },
      {
        id: 'c',
        label: 'A 5-second "Undo" toast',
        hint: 'For an instantly-irreversible and rare action, an undo window is too little.',
      },
      {
        id: 'd',
        label: 'Delete right away — it\'s faster',
        hint: 'Speed isn\'t worth an irreversible loss of data.',
      },
    ],
    correctOptionId: 'a',
    explanation:
      'The more dangerous and irreversible the action, the higher the "friction threshold" should be. Typing the project name demands awareness and rules out an accidental click — that\'s proportionate error prevention. For frequent, reversible actions, Undo is plenty instead.',
  },
};
