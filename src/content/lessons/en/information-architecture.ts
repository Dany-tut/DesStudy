import type { Lesson } from '@/lib/curriculum/types';

/**
 * UX Foundations — user flows series, part 3 of 3.
 * Information architecture: organising content around the user's mental model
 * so things are findable — grouping, labels, navigation depth.
 */
export const informationArchitectureEn: Lesson = {
  id: 'information-architecture',
  slug: 'information-architecture',
  title: 'Information architecture',
  pathTitle: 'UX Foundations',
  skill: 'flows',
  difficulty: 'medium',
  estimatedMinutes: 11,
  objectives: [
    "Group by the user's mental model, not the org chart",
    "Use clear labels in the user's language",
    'Keep navigation shallow and predictable',
  ],
  prerequisites: ['user-flows'],
  theory: [
    'The final lesson of the series — about how **content and navigation** are structured so people find what they need without thinking.',
    "**Group by the user's mental model**, not the company's internal structure. The user does not care which department owns a section — they care where they expect to find it.",
    '**Labels in the user\'s language.** "My account," not "CRM module." People just scroll past a menu item they do not understand.',
    '**Depth vs. breadth.** Too deep (7 clicks to the goal) and people get lost on the way; too broad (40 items in the menu) and it overwhelms. Aim for the balance where the path is short and predictable.',
  ],
  examples: [
    { kind: 'bad', caption: 'Menu items in internal jargon, all jumbled together', visual: 'nav-bad' },
    { kind: 'good', caption: 'Clear labels, grouped by meaning', visual: 'nav-good' },
  ],
  exercises: [
    {
      id: 'ia-choose-1',
      type: 'choose',
      prompt: 'What is the best principle for grouping sections in navigation?',
      options: [
        { id: 'a', label: "By the user's mental model — where they expect to find it" },
        { id: 'b', label: "By the company's internal org structure", hint: 'The user does not know and does not want to know which department owns what.' },
        { id: 'c', label: 'Alphabetically by section name', hint: 'Alphabet rarely lines up with meaning and task logic.' },
        { id: 'd', label: 'By the date the section was added', hint: 'Creation chronology does not help find what you need.' },
      ],
      correctOptionId: 'a',
      explanation:
        "Good IA mirrors the user's mental model: sections are where they are expected. Grouping by org structure is convenient for the team but makes the user guess where you put the thing they need.",
    },
    {
      id: 'ia-match',
      type: 'match',
      prompt: "Translate the menu item from internal jargon into the user's language.",
      pairs: [
        { id: 'p1', left: 'CRM module', right: 'Customers' },
        { id: 'p2', left: 'Billing center', right: 'Payment and invoices' },
        { id: 'p3', left: 'Asset manager', right: 'My files' },
      ],
      explanation:
        'Labels should speak the user\'s words. Internal system names make sense to the team, but to a person they are noise — they will not connect "Asset manager" with their own files.',
    },
    {
      id: 'ia-choose-2',
      type: 'choose',
      prompt: 'To make a rare but important section easier to find, the best move is to…',
      options: [
        { id: 'a', label: 'Move it to a predictable spot + add search across sections' },
        { id: 'b', label: 'Hide it deeper — since it is rare', hint: 'Rare does not mean unimportant; important things are not buried 6 clicks deep.' },
        { id: 'c', label: 'Add it to every menu at once', hint: 'Duplicating it everywhere creates noise and confusion.' },
        { id: 'd', label: 'Rename it to a trendy term', hint: 'An unclear label only makes it harder to find.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Findability is about getting to what you need quickly: a clear spot in the structure plus search as a fallback. Hiding something important "deeper" because it is rare is a straight path to people no longer using it.',
    },
  ],
  masteryChallenge: {
    id: 'ia-choose-mastery',
    type: 'choose',
    prompt:
      'In a banking app, users hunt for the "Statement" section for about 5 clicks on average and often fail to find it. What do you do, IA-wise?',
    options: [
      { id: 'a', label: 'Put "Statement" inside "Account/History" — where people look for it — and add it to search' },
      { id: 'b', label: 'Leave it as is, write instructions in the help section', hint: 'Nobody reads help; a structural problem is not cured by a help article.' },
      { id: 'c', label: 'Pull it out as a big standalone button on the home screen for everyone', hint: 'A rare task cannot go front and center for everyone — it would overload the home screen.' },
      { id: 'd', label: 'Rename it to "Transaction report"', hint: 'A more technical label only makes it harder to find.' },
    ],
    correctOptionId: 'a',
    explanation:
      "The fix is to match the mental model: statements are looked for next to the account and history, so that is where you put them, plus search as a fallback. This shortens the path and makes the section findable without overloading the home screen.",
  },
};
