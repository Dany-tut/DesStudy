import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — microcopy: the small text that guides, reassures and unblocks.
 * Button labels, error messages, empty-state and confirmation wording.
 */
export const microcopyEn: Lesson = {
  id: 'microcopy',
  slug: 'microcopy',
  title: 'Microcopy',
  pathTitle: 'UX Foundations',
  skill: 'microcopy',
  difficulty: 'easy',
  estimatedMinutes: 11,
  objectives: [
    'Write buttons that name the action, not just "OK"',
    'Phrase errors so they say what happened and what to do',
    'Keep the tone friendly and concrete instead of bureaucratic',
  ],
  prerequisites: ['forms'],
  theory: [
    '**A button names the action**, not agreement in general. "Save changes", "Pay $49" — not "OK" or "Submit". People read the button, not the text around it.',
    '**A good error** answers two questions: what happened and what to do now. "Sign-in failed" is bad; "Wrong password — check your caps lock or reset your access" is good.',
    '**Tone**: write like a person, not an instruction manual. Short, to the point, no bureaucratese ("perform data entry" → "type"). Friendly, but not flirty.',
    "Don't blame the user. \"You entered invalid data\" → \"Check the format — for example, +1 555 000-0000\". If the system fails, apologize and offer a way out instead of scolding.",
    "Empty states are copywriting too: explain what will be here and give a first step. \"Nothing here yet\" with no action is a missed opportunity.",
  ],
  examples: [
    { kind: 'bad', caption: 'An "OK" button and an "Error" message — nothing is clear', visual: 'form-bad' },
    { kind: 'good', caption: '"Save" + a clear error with a solution', visual: 'form-good' },
  ],
  exercises: [
    {
      id: 'mc-choose-1',
      type: 'choose',
      prompt: 'A form creates a new project. Which button label is better?',
      options: [
        { id: 'a', label: 'Create project' },
        { id: 'b', label: 'OK', hint: '"OK" doesn\'t name the action — you have to read everything around it.' },
        { id: 'c', label: 'Submit', hint: 'Too generic: submit what exactly, and where?' },
        { id: 'd', label: 'Next', hint: 'Fine for a wizard step, but not for the final action.' },
      ],
      correctOptionId: 'a',
      explanation:
        'The button should name the concrete action: "Create project". People often read only the button — it should stand on its own, without relying on nearby text.',
    },
    {
      id: 'mc-choose-2',
      type: 'choose',
      prompt: 'Which sign-in error message is better?',
      options: [
        { id: 'a', label: 'Wrong password — check your caps lock or reset your access' },
        { id: 'b', label: 'Error', hint: 'Says neither what happened nor what to do.' },
        { id: 'c', label: 'You entered invalid data', hint: 'Blames the user and offers no way out.' },
        { id: 'd', label: 'Error 401: Unauthorized', hint: 'A technical code gives the user nothing.' },
      ],
      correctOptionId: 'a',
      explanation:
        'A good error explains the cause and offers a next step: what went wrong (the password) and what to do (caps lock / reset). No blame, no technical codes.',
    },
    {
      id: 'mc-choose-3',
      type: 'choose',
      prompt: 'How would you rewrite "Perform entry of the delivery address" so it sounds human?',
      options: [
        { id: 'a', label: 'Enter your delivery address' },
        { id: 'b', label: 'Carry out the completion of the address field', hint: 'Even more bureaucratese.' },
        { id: 'c', label: 'The address data must be entered', hint: 'Passive and formal — hard to read.' },
        { id: 'd', label: 'Address!', hint: 'Too abrupt and blunt.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Write with a plain action verb: "Enter your delivery address". Bureaucratese ("perform entry") makes it longer and impersonal — plain language is clearer and reads faster.',
    },
    {
      id: 'mc-match-1',
      type: 'match',
      prompt: 'Match the place in the interface with the wording that fits it.',
      pairs: [
        { id: 'pay', left: 'Pay button', right: 'Pay $49' },
        { id: 'err', left: 'Network error', right: 'No connection — retry?' },
        { id: 'empty', left: 'Empty list', right: 'Create your first task' },
        { id: 'success', left: 'Success', right: 'Project saved' },
      ],
      explanation:
        'Each place needs its own tone: a button — a concrete action with the amount, an error — the cause and a way out, an empty state — a first step, success — a short confirmation. Copy guides the user.',
    },
    {
      id: 'mc-order-1',
      type: 'order',
      prompt: 'Order the parts of a good error message by priority — what matters most to get across.',
      items: [
        { id: 'what', label: 'What happened', size: 'body' },
        { id: 'why', label: 'Why (if useful)', size: 'body' },
        { id: 'how', label: 'What to do next', size: 'body' },
        { id: 'tone', label: 'Friendly tone, no blame', size: 'caption' },
      ],
      correctOrder: ['what', 'how', 'why', 'tone'],
      explanation:
        'First — what happened, right after it — what to do (this unblocks the user). The cause is useful but secondary; tone frames everything but doesn\'t replace the substance. The main thing is to get the person back to action.',
    },
  ],
  masteryChallenge: {
    id: 'mc-choose-4',
    type: 'choose',
    prompt:
      'A delete-account dialog. Which "title + confirm button" pair is safer and clearer?',
    options: [
      {
        id: 'a',
        label: '"Delete account permanently?" + a "Delete account" button',
      },
      { id: 'b', label: '"Are you sure?" + an "OK" button', hint: '"Are you sure?" and "OK" don\'t name the irreversible action — easy to slip.' },
      { id: 'c', label: '"Warning!" + a "Yes" button', hint: '"Yes" to "Warning!" is ambiguous: yes to what?' },
      { id: 'd', label: '"Action" + a "Continue" button', hint: 'Neutral to the point of being dangerous — no signal that it\'s irreversible.' },
    ],
    correctOptionId: 'a',
    explanation:
      'For irreversible actions the title and button should name the consequence directly: "Delete account permanently?" and "Delete account". This cuts down accidental confirmations — the person sees what they\'re agreeing to right on the button.',
  },
};
