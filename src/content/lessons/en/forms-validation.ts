import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — forms series, part 2 of 3.
 * Validation and errors: inline messages tied to the field, sensible timing,
 * and wording that says how to fix.
 */
export const formsValidationEn: Lesson = {
  id: 'forms-validation',
  slug: 'forms-validation',
  title: 'Forms: validation and errors',
  pathTitle: 'UX Foundations',
  skill: 'forms',
  difficulty: 'medium',
  estimatedMinutes: 10,
  objectives: [
    'Show the error next to the specific field',
    'Validate at the right moment, without nagging on every letter',
    'Word the error so it is clear how to fix it',
  ],
  prerequisites: ['forms'],
  theory: [
    'The second forms lesson — about what happens when something is filled in wrong.',
    '**The error is tied to the field**, not to the whole form. A "form submission error" at the top makes you hunt for the problem again; text under the field itself ("Email must contain @") saves that time.',
    '**Timing matters.** Validating on every character is aggressive (the person is still typing). Usually better — when they leave the field (on blur) and on submit. Confirming success is useful too (a green checkmark).',
    '**The wording says how to fix it.** Not "Invalid value," but "Password — at least 8 characters." And remember: the best error is a prevented one (a mask, an input constraint, a sensible default).',
  ],
  examples: [
    { kind: 'bad', caption: 'A generic error at the top of the form, unclear which field', visual: 'form-bad' },
    { kind: 'good', caption: 'An error under the specific field, with a hint', visual: 'form-good' },
  ],
  exercises: [
    {
      id: 'fv-choose-1',
      type: 'choose',
      prompt: "Where should a specific field's error message appear?",
      options: [
        { id: 'a', label: 'Right under that field, with a specific wording' },
        { id: 'b', label: 'As a generic line at the top of the form: "Form submission error"', hint: 'This makes you hunt again for which field is broken.' },
        { id: 'c', label: 'In a toast pop-up that disappears after 3 seconds', hint: 'The toast may vanish before the person finds the field.' },
        { id: 'd', label: 'Only in the developer console', hint: 'An ordinary user will not open the console.' },
      ],
      correctOptionId: 'a',
      explanation:
        'An error next to the field with a specific wording ("Email must contain @") saves time: you do not have to match a generic message to one of the form\'s fields.',
    },
    {
      id: 'fv-choose-2',
      type: 'choose',
      prompt: "When is it usually best to show a field's validation error?",
      options: [
        { id: 'a', label: 'When the person leaves the field (on blur) and on submit' },
        { id: 'b', label: 'On every character entered', hint: 'Scolding while the person is still typing is aggressive and annoying.' },
        { id: 'c', label: 'Only after three failed submissions', hint: 'Too late — the person is already tired of guessing.' },
        { id: 'd', label: 'Never, so as not to get in the way', hint: 'Without feedback the form cannot be filled in correctly.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Checking when the field is left gives feedback once the input is complete but does not nag on every letter. Plus a final check on submit. That way the error arrives on time and does not irritate.',
    },
    {
      id: 'fv-match',
      type: 'match',
      prompt: 'Replace the useless error with a clear one.',
      pairs: [
        { id: 'p1', left: 'Invalid value', right: 'Password — at least 8 characters' },
        { id: 'p2', left: 'Email field error', right: 'Looks like the @ symbol is missing' },
        { id: 'p3', left: 'Field filled in incorrectly', right: 'The date cannot be in the future' },
      ],
      explanation:
        'A good error says what exactly is wrong and how to fix it. Abstract "invalid value" makes you guess; a specific wording leads straight to the fix.',
    },
  ],
  masteryChallenge: {
    id: 'fv-choose-mastery',
    type: 'choose',
    prompt: 'The "Delivery date" field is often filled in with a format error. What works best?',
    options: [
      { id: 'a', label: 'Replace free text entry with a calendar — make the error impossible to commit' },
      { id: 'b', label: 'Show a red error after every wrong letter', hint: 'Treats the symptom aggressively, but does not remove the cause — free text entry.' },
      { id: 'c', label: 'Add a long hint about the format in the help section', hint: 'Nobody reads help next to a field; better to make the mistake impossible by design.' },
      { id: 'd', label: 'Accept any text and sort it out later', hint: 'Shifts error handling to the backend and to the person later.' },
    ],
    correctOptionId: 'a',
    explanation:
      'The best error is a prevented one. A calendar physically prevents entering a wrong date format, so validation and error messages are barely needed here. Prevention is more reliable than catching an error after the fact.',
  },
};
