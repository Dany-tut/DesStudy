import type { Lesson } from '@/lib/curriculum/types';

/**
 * Design Systems — AI in the design workflow: generative tools (Figma Make,
 * Mixboard, Stitch, Pomelli) and vibe coding (Figma MCP, Make + Codex).
 */
export const aiDesignToolsEn: Lesson = {
  id: 'ai-design-tools',
  slug: 'ai-design-tools',
  title: 'AI and Vibe Coding',
  pathTitle: 'Design Systems',
  skill: 'ai-tools',
  difficulty: 'medium',
  estimatedMinutes: 10,
  objectives: [
    'Tell generative AI design tools apart and know their roles',
    'Understand what vibe coding is and how design turns into code',
    'Use AI as an accelerator, not a replacement for design thinking',
  ],
  prerequisites: ['figma-components-slots'],
  theory: [
    '**Generative tools** speed up the grind: **Figma Make** builds interfaces and prototypes from a description, **Google Mixboard / Stitch** generate moodboards and concepts, **Pomelli AI** and the like — quick visual variations.',
    'AI is great for starting out and exploring: rough screens, palette options, placeholder content. But the system, the hierarchy, and the product logic are the designer\'s call — the model doesn\'t know your user.',
    '**Vibe coding** — turning design into working code through AI: **Figma MCP** hands the agent the structure of your layout, **Figma Make + Codex** and similar tools generate the frontend from that layout.',
    'The key to a good result is a clean source: atom-components, Auto Layout, tokens, and clear layer names. A tidy design system translates to code far more accurately than "eyeballed" screens.',
    'AI doesn\'t cancel the fundamentals: grid, typography, contrast, states. It just gets them to code faster — if the fundamentals are laid down right.',
  ],
  examples: [
    { kind: 'bad', caption: 'An "eyeballed" screen — AI turns chaos into chaotic code', visual: 'tokens-bad' },
    { kind: 'good', caption: 'Atoms + Auto Layout + tokens — a clean translation to code', visual: 'tokens-good' },
  ],
  exercises: [
    {
      id: 'ai-choose-1',
      type: 'choose',
      prompt: 'What is Figma Make best suited for at the start of a project?',
      options: [
        { id: 'a', label: 'Quickly building rough screens and a prototype from a description' },
        { id: 'b', label: 'Finalizing the design system for you', hint: 'The system and logic are the designer\'s call; AI gives you a draft.' },
        { id: 'c', label: 'Replacing user research', hint: 'The model doesn\'t know your user — research is still on you.' },
        { id: 'd', label: 'Automatically writing a project brief for the client', hint: 'That\'s not what an interface generator is for.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Generative tools shine at a fast start: rough screens, prototypes, variations. That speeds up exploring ideas, but it doesn\'t replace the designer\'s design decisions.',
    },
    {
      id: 'ai-choose-2',
      type: 'choose',
      prompt: 'What is vibe coding?',
      options: [
        { id: 'a', label: 'Turning design into working code through AI agents' },
        { id: 'b', label: 'A way of styling layouts', hint: 'It\'s not about visual style, it\'s about generating code.' },
        { id: 'c', label: 'A method for picking a color palette', hint: 'The palette has nothing to do with it.' },
        { id: 'd', label: 'The name of a Figma plugin', hint: 'It\'s an approach, not a specific plugin.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Vibe coding is when an AI agent generates the frontend from your layout (e.g. via Figma MCP) and tools like Figma Make + Codex. The designer describes the intent, the agent assembles the code.',
    },
    {
      id: 'ai-choose-3',
      type: 'choose',
      prompt: 'What improves the quality of a layout-to-code translation through AI the most?',
      options: [
        { id: 'a', label: 'A clean source: atoms, Auto Layout, tokens, clear names' },
        { id: 'b', label: 'A longer prompt', hint: 'A prompt helps, but it won\'t save a messy layout.' },
        { id: 'c', label: 'A more expensive model', hint: 'The model matters, but garbage in gives garbage out.' },
        { id: 'd', label: 'Exporting to a higher-resolution PNG', hint: 'A raster carries none of the structure the agent reads.' },
      ],
      correctOptionId: 'a',
      explanation:
        'The agent reads the structure: components, Auto Layout, tokens, layer names. The cleaner the design system, the more accurate and predictable the code. A messy layout translates to messy code no matter the model.',
    },
    {
      id: 'ai-match-1',
      type: 'match',
      prompt: 'Match each tool to its main role.',
      pairs: [
        { id: 'make', left: 'Figma Make', right: 'screens and prototypes from a description' },
        { id: 'mixboard', left: 'Mixboard / Stitch', right: 'moodboards and concepts' },
        { id: 'mcp', left: 'Figma MCP', right: 'hand the layout to an AI agent' },
        { id: 'codex', left: 'Make + Codex', right: 'generate frontend code' },
      ],
      explanation:
        'Each tool has its niche: Make — interfaces, Mixboard/Stitch — concept boards, MCP — the "layout → agent" bridge, Make+Codex — code generation. Together they cover the path from idea to frontend.',
    },
  ],
  masteryChallenge: {
    id: 'ai-choose-4',
    type: 'choose',
    prompt:
      'A team wants to turn an approved Figma layout into a working React prototype in a day. What is critical to check in the layout BEFORE starting vibe coding?',
    options: [
      {
        id: 'a',
        label: 'That the layout is built from components on Auto Layout with tokens',
      },
      { id: 'b', label: 'That every screen is exported to PNG', hint: 'A raster carries no structure — the agent needs a layout, not a picture.' },
      { id: 'c', label: 'That the most expensive model is chosen', hint: 'Without a clean source, even a top model gives you mush.' },
      { id: 'd', label: 'That the prompt is as long as possible', hint: 'Prompt length won\'t replace the structure of the layout.' },
    ],
    correctOptionId: 'a',
    explanation:
      'Vibe coding translates structure, not a picture. Components, Auto Layout, and tokens give the agent semantics: what\'s a button here, where the spacing is, which color-roles apply. That\'s what decides whether you get a prototype in a day or a day of debugging.',
  },
};
