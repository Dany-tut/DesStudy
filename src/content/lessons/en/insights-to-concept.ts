import type { Lesson } from '@/lib/curriculum/types';

/**
 * Design Process — series part 3 of 3.
 * From raw research to a direction: synthesis into insights, moodboard/concept,
 * and wireframes before visual polish.
 */
export const insightsToConceptEn: Lesson = {
  id: 'insights-to-concept',
  slug: 'insights-to-concept',
  title: 'From insights to concept',
  pathTitle: 'Design Process',
  skill: 'process',
  difficulty: 'easy',
  estimatedMinutes: 11,
  objectives: [
    'Turn raw data into insights, not a retelling',
    'Move from concept and moodboard to wireframes',
    'Check the structure on the skeleton before the visuals',
  ],
  prerequisites: ['brief-research', 'research-methods'],
  theory: [
    'The data is gathered — but on its own it isn\'t a solution yet. The final lesson in the series: how to turn research into a direction and the first skeleton of a screen.',
    '**Synthesis: data → insights.** An insight is a conclusion and a pattern ("people abandon payment because they don\'t trust an unfamiliar step"), not a raw note or a number. A pile of observations without synthesis doesn\'t move the project.',
    '**Concept and moodboard** set the direction before layout: the key idea of the solution, the tone, references. It\'s the bridge between "what we understood" and "what we\'ll do".',
    '**Wireframes** are a skeleton without color or typography: blocks, hierarchy, flows. Here it\'s cheap to check the structure; a logic mistake is better caught on the skeleton than after days of drawing.',
    'The full order: brief → research → **insights** → concept → wireframe → visuals. Each step builds on the previous one; jumping straight to a "pretty mockup" almost always comes back with rework.',
  ],
  examples: [
    { kind: 'bad', caption: 'Straight to the final visuals with no structure', visual: 'spacing-bad' },
    { kind: 'good', caption: 'A wireframe skeleton before drawing the visuals', visual: 'spacing-good' },
  ],
  exercises: [
    {
      id: 'itc-choose-1',
      type: 'choose',
      prompt: 'Which of these is an insight, not just data?',
      options: [
        {
          id: 'a',
          label: 'People abandon payment because they don\'t trust the unfamiliar "3-D Secure" step',
        },
        {
          id: 'b',
          label: '68% of sessions end at the payment step',
          hint: 'That\'s a raw fact — it says "how many", but not "why". An insight explains the cause.',
        },
        {
          id: 'c',
          label: 'We ran 8 interviews and a survey',
          hint: "That's a description of the process, not a conclusion from it.",
        },
        {
          id: 'd',
          label: 'Users mostly come from mobile',
          hint: 'A fact with no interpretation — what does it change in the solution?',
        },
      ],
      correctOptionId: 'a',
      explanation:
        'An insight explains the cause and hints at an action: distrust of an unfamiliar step → make it clear and familiar. Percentages and process descriptions are raw material; an insight is born from synthesizing them.',
    },
    {
      id: 'itc-order-1',
      type: 'order',
      prompt: 'Order the stages from project start to the first mockup.',
      items: [
        { id: 'brief', label: 'Brief / goals', size: 'body' },
        { id: 'research', label: 'Research', size: 'body' },
        { id: 'insight', label: 'Insights', size: 'body' },
        { id: 'concept', label: 'Concept and moodboard', size: 'body' },
        { id: 'wire', label: 'Wireframes', size: 'body' },
      ],
      correctOrder: ['brief', 'research', 'insight', 'concept', 'wire'],
      explanation:
        'First we capture the task (brief), gather data (research), turn it into conclusions (insights), set the direction (concept), and only then build the skeleton (wireframes). Visuals come on top of a finished frame.',
    },
    {
      id: 'itc-choose-2',
      type: 'choose',
      prompt: 'Why make wireframes before the visuals?',
      options: [
        { id: 'a', label: 'Cheap to check the structure and logic before investing in visuals' },
        { id: 'b', label: 'So the client sees the final design sooner', hint: 'A wireframe is a skeleton, not the final.' },
        { id: 'c', label: 'Because Figma requires it', hint: "The tool doesn't dictate a process stage." },
        { id: 'd', label: 'To save on research', hint: 'Wireframes don\'t replace research, they come after it.' },
      ],
      correctOptionId: 'a',
      explanation:
        'A wireframe is a skeleton without color or typography. On it, hierarchy, blocks, and flows are checked cheaply and quickly. A structure mistake is better caught here than after days of drawing visuals.',
    },
  ],
  masteryChallenge: {
    id: 'itc-figma-1',
    type: 'figma-link',
    prompt:
      'Build a wireframe of one screen (for example, a checkout screen) in Figma: only blocks, hierarchy, and flows, without color or final typography. Send the link.',
    checklist: [
      'There\'s a clear hierarchy of blocks (what\'s primary, what\'s secondary)',
      'The screen\'s main flow/action is shown',
      'The insight is visible in the solution (for example, the payment step is made clear)',
      'No final visuals — it\'s a skeleton, not a rendering',
    ],
    explanation:
      'A wireframe checks the structure before the visuals. If the skeleton already shows what the screen does, where the main path leads, and how the key insight is addressed, the foundation is laid right, and the visuals will sit on a finished frame.',
  },
};
