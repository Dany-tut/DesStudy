import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — forms series, part 3 of 3.
 * Structure and long forms: grouping, order, chunking into steps, and cutting
 * fields that don't earn their place.
 */
export const formsStructureEn: Lesson = {
  id: 'forms-structure',
  slug: 'forms-structure',
  title: 'Forms: structure and long forms',
  pathTitle: 'UX Foundations',
  skill: 'forms',
  difficulty: 'medium',
  estimatedMinutes: 10,
  objectives: [
    'Group fields by meaning and a logical order',
    'Break long forms into steps with progress',
    "Cut fields that don't earn their place",
  ],
  prerequisites: ['forms'],
  theory: [
    'The final forms lesson — about the form as a whole: order, grouping, and long questionnaires.',
    '**Grouping by meaning** cuts the load more than simply reducing the number of fields: a form of 8 fields in 3 clear blocks reads easier than a form of 5 jumbled together. The order of blocks is logical: who you are → how to reach you → securing access → the action.',
    '**Long forms — into steps.** A multi-step wizard with a progress indicator is not as scary as one wall of 30 fields. The person sees how much is left and moves through it in parts.',
    '**Every field earns its place.** Ask only for what is really needed right now. Cut or defer the optional. One field per row usually reads better than several in a row.',
  ],
  examples: [],
  exercises: [
    {
      id: 'fs-order-1',
      type: 'order',
      prompt: 'Assemble a sign-up form from meaningful blocks: top to bottom.',
      items: [
        { id: 'personal', label: 'First and last name', size: 'body' },
        { id: 'contact', label: 'Email and phone', size: 'body' },
        { id: 'security', label: 'Password', size: 'body' },
        { id: 'submit', label: '"Sign up" button', size: 'button' },
      ],
      correctOrder: ['personal', 'contact', 'security', 'submit'],
      explanation:
        'First the block about who the person is (name), then how to reach them (contacts), then securing access (password) — and only at the end the action. Each block is a complete meaningful group, not a jumble.',
    },
    {
      id: 'fs-choose-1',
      type: 'choose',
      prompt: 'A 25-field questionnaire on one screen scares people off and gets abandoned. What do you do?',
      options: [
        { id: 'a', label: 'Break it into steps with a progress indicator and cut the extra fields' },
        { id: 'b', label: 'Keep it all, but shrink the font so it fits', hint: 'A small font does not remove the volume — it only makes reading harder.' },
        { id: 'c', label: 'Stack fields into two or three columns', hint: 'Multi-column forms disrupt the reading and filling order.' },
        { id: 'd', label: 'Make everything required so it definitely gets filled', hint: 'More required fields means higher drop-off, not lower.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Two moves save a long form: break it into steps with progress (you see how much is left) and cut fields you can do without right now. The volume feels lighter, and drop-off falls.',
    },
    {
      id: 'fs-choose-2',
      type: 'choose',
      prompt: 'What is usually unnecessary in a delivery order form?',
      options: [
        { id: 'a', label: 'The optional "How did you hear about us?" field' },
        { id: 'b', label: 'Delivery address', hint: 'Without an address the order cannot be delivered — it is the core of the form.' },
        { id: 'c', label: 'Payment method', hint: 'Payment is needed to complete the order.' },
        { id: 'd', label: 'A contact for questions about the order', hint: 'Needed to clarify delivery details.' },
      ],
      correctOptionId: 'a',
      explanation:
        'A marketing "how did you hear about us" question is not needed to fulfil the order — remove it from the main path or make it optional and unobtrusive. Address, payment, and contact are part of the goal; leave them alone.',
    },
  ],
  masteryChallenge: {
    id: 'fs-figma-1',
    type: 'figma-link',
    prompt:
      'Design a 5-6 field sign-up form in Figma: persistent labels (not placeholders), an inline error for at least one field, an explicit required-ness mark, fields grouped by meaning.',
    checklist: [
      'The label stays visible instead of disappearing on input',
      'At least one error is shown next to the specific field, not as a generic line',
      'Required/optional fields are marked explicitly',
      'Fields are grouped by meaning, not as one solid list',
    ],
    explanation:
      'A form with persistent labels, pinpointed errors, and explicit grouping reduces sign-up friction more than simply cutting the number of fields — because it reads and fills in faster.',
  },
};
