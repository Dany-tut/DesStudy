import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — forms series, part 1 of 3.
 * Labels and inputs: keep labels visible, pick the right input type, mark
 * required fields explicitly.
 */
export const formsEn: Lesson = {
  id: 'forms',
  slug: 'forms',
  title: 'Forms: labels and fields',
  pathTitle: 'UX Foundations',
  skill: 'forms',
  difficulty: 'medium',
  estimatedMinutes: 10,
  objectives: [
    'Keep the field label always visible instead of hiding it in the placeholder',
    'Pick the right input type for the data',
    'Mark required and optional fields explicitly',
  ],
  prerequisites: ['user-flows'],
  theory: [
    'The first of three lessons on **forms**. We start with the basics: labels and the fields themselves.',
    '**A placeholder is not a substitute for a label.** The moment a person starts typing, the hint disappears — and with it, the understanding of what the field was. A label stays put: above the field or as a floating label.',
    '**The right input type** saves effort: an email field for email, tel for phone, a calendar for dates. On mobile it also tunes the keyboard and cuts down on errors.',
    '**Required-ness** is marked explicitly (an asterisk or an "optional" tag), not left for people to guess from an error after they submit.',
  ],
  examples: [
    { kind: 'bad', caption: 'A placeholder instead of a label — the hint vanishes on input', visual: 'form-bad' },
    { kind: 'good', caption: 'A persistent label above the field', visual: 'form-good' },
  ],
  exercises: [
    {
      id: 'frm-choose-1',
      type: 'choose',
      prompt: 'What is the main problem with a placeholder instead of a label?',
      options: [
        { id: 'a', label: 'The placeholder disappears on input — the person loses the hint about what the field is' },
        { id: 'b', label: 'A placeholder is always too low-contrast', hint: 'Contrast can be tuned — the issue is not that, but that the text vanishes on input.' },
        { id: 'c', label: 'A placeholder cannot be styled to the design system', hint: 'Technically it can be styled — the problem is not the appearance.' },
        { id: 'd', label: 'A placeholder makes the field wider', hint: 'A placeholder does not affect field width.' },
      ],
      correctOptionId: 'a',
      explanation:
        'As soon as a person starts typing, the placeholder disappears — and with it the hint about what to enter. A persistent label fixes this by always staying in place.',
    },
    {
      id: 'frm-choose-2',
      type: 'choose',
      prompt: 'A phone number field on mobile. Which input type do you choose?',
      options: [
        { id: 'a', label: 'tel — shows a numeric keypad and suitable validation' },
        { id: 'b', label: 'Plain text', hint: 'Gives a letter keyboard and no help with format — more errors.' },
        { id: 'c', label: 'password', hint: 'Hides the input — a phone number does not need to be hidden.' },
        { id: 'd', label: 'email', hint: 'The email type expects an @ and does not suit phone digits.' },
      ],
      correctOptionId: 'a',
      explanation:
        'The right input type tunes the keyboard and validation to the data. For a phone that is tel: a numeric keypad on mobile and less chance of a format mistake.',
    },
    {
      id: 'frm-match',
      type: 'match',
      prompt: 'Match the field with a suitable input type.',
      pairs: [
        { id: 'p1', left: 'Email', right: 'input type=email' },
        { id: 'p2', left: 'Date of birth', right: 'Calendar / date' },
        { id: 'p3', left: 'Item quantity', right: 'Numeric field with a stepper' },
      ],
      explanation:
        'The field type should match the data: email checks the format and gives "@" on the keyboard, a calendar rules out an invalid date, a stepper makes entering a quantity easy. That means fewer errors before validation even runs.',
    },
  ],
  masteryChallenge: {
    id: 'frm-choose-mastery',
    type: 'choose',
    prompt: 'What is the most honest way to show which fields are required and which are not?',
    options: [
      { id: 'a', label: 'Mark them explicitly: an asterisk on required ones or "optional" on the rest' },
      { id: 'b', label: 'No marking — let them find out from an error after submitting', hint: 'Guessing via an after-the-fact error is extra friction and annoyance.' },
      { id: 'c', label: 'Make optional fields fainter', hint: 'Lowered contrast reads as "disabled," not "optional."' },
      { id: 'd', label: 'Mention it only in the help section', hint: 'Nobody reads help next to a field; the mark belongs in place.' },
    ],
    correctOptionId: 'a',
    explanation:
      'Required-ness should be visible before submitting: an asterisk on required fields (or an "optional" tag, if they are the minority). That way the person knows the scope up front and does not hit an error after the fact.',
  },
};
