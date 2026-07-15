import type { Lesson } from '@/lib/curriculum/types';

/**
 * Intro lecture about the tool itself. Comes right after "design-thinking-intro":
 * that one is about how to think, this one introduces Figma so you can start
 * thinking in it rather than memorizing the whole thing. Pure theory (slide
 * sections) for now, no exercises.
 */
export const figmaIntroEn: Lesson = {
  id: 'figma-intro',
  slug: 'figma-intro',
  title: 'Meeting Figma — start thinking inside it',
  pathTitle: 'UI Foundations',
  skill: 'figma-basics',
  kind: 'lecture',
  difficulty: 'intro',
  estimatedMinutes: 8,
  objectives: [
    'Understand the logic of Figma\'s interface instead of memorizing every button',
    'Get clear on what Canvas, Page, Frame, and layers are',
    'Learn the core tools and working modes',
  ],
  prerequisites: ['design-thinking-intro'],
  theory: [],
  sections: [
    {
      heading: 'Not 10 hours of theory — straight into the tool',
      body: [
        'We won\'t spend 10 hours talking about design first and only someday open the tool. We\'ll take short steps right into Figma.',
        'The goal right now is **not to learn all of Figma**. The goal is **to start thinking in it**.',
      ],
      chips: [
        'Download',
        'Create a file',
        'Canvas',
        'Page',
        'Frame',
        'Frame vs Group',
        'Inserting text',
        'Shape',
        'Moving objects',
        'Layers',
        'Zoom',
        'Order',
        'Share',
        'Preview',
        'Prototype',
      ],
    },
    {
      heading: 'The interface: where a file begins',
      body: [
        'On the left is navigation through your space: drafts, projects, assets, and trash, while the Community section shows other people\'s work. Top right is the button to create a file.',
        'Click the buttons below to see what each menu item and each file type is responsible for:',
      ],
      visual: 'figma-interface',
    },
    {
      heading: 'Page and Canvas — the space where you work',
      body: [
        'The Canvas is simply the space where you work: you can freely lay out objects, sections, frames, and other elements on it.',
        'Around the canvas are the panels of the work window. Click each one to see what it\'s responsible for:',
      ],
      visual: 'figma-canvas',
    },
    {
      heading: 'The toolbar: six groups',
      body: ['Click a group to expand what\'s in it and which hotkeys it uses:'],
      visual: 'figma-toolbar',
    },
    {
      heading: 'There are other modes too',
      body: ['Beyond the main toolbar there are four more modes — click to learn about each:'],
      visual: 'figma-modes',
    },
  ],
  examples: [],
  exercises: [],
};
