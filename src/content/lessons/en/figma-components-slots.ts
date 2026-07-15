import type { Lesson } from '@/lib/curriculum/types';

/**
 * Design Systems — Figma craft: auto layout, atomic components, master/child
 * inheritance, overrides, reset/push, and the new Slots feature.
 */
export const figmaComponentsSlotsEn: Lesson = {
  id: 'figma-components-slots',
  slug: 'figma-components-slots',
  title: 'Components, Overrides, and Slots',
  pathTitle: 'Design Systems',
  skill: 'figma-craft',
  difficulty: 'hard',
  estimatedMinutes: 14,
  objectives: [
    'Understand master → instance inheritance and how overrides work',
    'Know when to make a component and when to leave a plain layer',
    'Use Slots to swap an instance\'s content without breaking the link',
  ],
  prerequisites: ['components-variants'],
  theory: [
    '**Auto Layout** — auto-arrangement: the element positions its children by direction, gap, and padding on its own. Change the content and the layout reflows — you never nudge anything by hand.',
    'Build components **from atoms** (icon, button, checkbox, avatar), not from whole cards. Assemble cards on frames out of those atoms. Rule: an element repeats 2+ times → make it a component.',
    '**Master → instance**: edit the master and every instance updates. In an instance you can only change what the master allows. Properties you change in an instance become **overrides** and stop inheriting from the master.',
    'Return an instance to the master\'s settings — **Reset instance**. Push an instance\'s edits back into the master — **Push changes to main component**.',
    '**Slots** (new) — an area inside a component where you can drop in arbitrary components without breaking the link to the master. You used to build every variant by hand; now you put anything into a "slot" and the instance stays an instance.',
  ],
  examples: [
    { kind: 'bad', caption: 'Card glued into a single component — the atoms can\'t be reused', visual: 'components-bad' },
    { kind: 'good', caption: 'Atom-components assembled on a frame', visual: 'components-good' },
  ],
  exercises: [
    {
      id: 'fc-choose-1',
      type: 'choose',
      prompt: 'The "heart" icon appears in the layout 12 times. What do you do?',
      options: [
        { id: 'a', label: 'Make an atom-component and place instances of it' },
        { id: 'b', label: 'Copy the layer 12 times', hint: 'The copies will drift: fix one and you\'ll forget the rest.' },
        { id: 'c', label: 'Redraw it from scratch each time', hint: 'No consistency and twice the work.' },
        { id: 'd', label: 'Group all 12 into one layer', hint: 'A group is not a component — no reuse and no inheritance.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Repeats 2+ times → component. Make the icon an atom-component: a master edit instantly reaches all 12 instances and the system stays consistent.',
    },
    {
      id: 'fc-choose-2',
      type: 'choose',
      prompt:
        'In the master the text is black. In an instance you made it red (an override). Then in the master you switched the text to bold. What happens in the instance?',
      options: [
        { id: 'a', label: 'The text becomes bold and stays red' },
        { id: 'b', label: 'The text becomes bold and black', hint: 'The color is already overridden — it won\'t revert to the master on its own.' },
        { id: 'c', label: 'Nothing changes', hint: 'The weight was never overridden, so it inherits.' },
        { id: 'd', label: 'The instance detaches from the master', hint: 'An override doesn\'t break the link — it only freezes the changed property.' },
      ],
      correctOptionId: 'a',
      explanation:
        'An override freezes only the changed property (color). The weight was untouched, so it keeps inheriting and picks up bold from the master. Result: bold + red.',
    },
    {
      id: 'fc-choose-3',
      type: 'choose',
      picker: 'segmented',
      prompt: 'You want to push a good edit from an instance back into the master component. Which command?',
      options: [
        { id: 'a', label: 'Reset instance', hint: 'The opposite — it resets the instance to the master.' },
        { id: 'b', label: 'Push to main' },
        { id: 'c', label: 'Detach', hint: 'Detach unlinks the instance from the master — the connection is lost.' },
      ],
      correctOptionId: 'b',
      explanation:
        '"Push changes to main component" sends the instance\'s edits to the master, and they spread to all the other instances. "Reset instance" does the reverse — it returns the instance to the master\'s state.',
    },
    {
      id: 'fc-match-1',
      type: 'match',
      prompt: 'Match the Figma concept to its essence.',
      pairs: [
        { id: 'al', left: 'Auto Layout', right: 'auto-arrange by gap/padding' },
        { id: 'override', left: 'Override', right: 'local edit on an instance' },
        { id: 'reset', left: 'Reset instance', right: 'return to the master' },
        { id: 'slot', left: 'Slot', right: 'drop in content without detaching' },
      ],
      explanation:
        'Auto Layout builds the layout for you; an override is a local instance change; Reset instance rolls it back to the master; a Slot lets you drop in arbitrary components without detaching the instance.',
    },
    {
      id: 'fc-choose-4',
      type: 'choose',
      prompt:
        'You need a card-instance where you can swap and add inner components (photo ↔ chart) without detaching it from the master. What do you use?',
      options: [
        { id: 'a', label: 'Slots' },
        { id: 'b', label: 'Detach instance', hint: 'Detach breaks the link to the master — updates stop arriving.' },
        { id: 'c', label: 'Copy the master and rework it', hint: 'That breeds duplicates — exactly what components move you away from.' },
        { id: 'd', label: 'Just override it', hint: 'An override changes properties but doesn\'t let you freely drop in other components.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Slots are made for exactly this: put any components into a "slot" and swap them around, while the instance stays linked to the master. Before, you\'d have had to build every variant by hand.',
    },
  ],
  masteryChallenge: {
    id: 'fc-order-1',
    type: 'order',
    prompt: 'Put the steps of building a component card in a sensible order.',
    items: [
      { id: 'atoms', label: 'Build atom-components (icon, button, avatar)', size: 'body' },
      { id: 'autolayout', label: 'Wrap them in Auto Layout with gap and padding', size: 'body' },
      { id: 'assemble', label: 'Assemble the card from instances of the atoms', size: 'body' },
      { id: 'slots', label: 'Move the changeable area into a Slot', size: 'body' },
    ],
    correctOrder: ['atoms', 'autolayout', 'assemble', 'slots'],
    explanation:
      'Atoms first, then Auto Layout as the skeleton, then assembling the card from instances, and finally a Slot for the part you need to change freely. From building blocks to flexibility.',
  },
};
