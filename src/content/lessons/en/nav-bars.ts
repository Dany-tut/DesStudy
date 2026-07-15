import type { Lesson } from '@/lib/curriculum/types';

/** UI Foundations — where the navigation bar lives, and how it collapses under pressure. */
export const navBarsEn: Lesson = {
  id: 'nav-bars',
  slug: 'nav-bars',
  title: 'Navigation bars: where the menu lives',
  pathTitle: 'UI Foundations',
  skill: 'navigation',
  difficulty: 'medium',
  estimatedMinutes: 12,
  objectives: [
    'Choose between static, fixed, floating and sidebar placement for a bar',
    'Understand when to collapse the menu into a burger and when to keep it full',
    'Assemble a bar as a set of parameters, not redraw it from scratch for every screen',
  ],
  prerequisites: ['spacing-8pt-grid'],
  theory: [
    '**Placement** is a choice, not a single right answer. `static` scrolls out of view; `fixed` is always in place but permanently eats screen height; `floating` (offset from the edge) takes up less and reads more easily; `sidebar` gives the menu itself lots of room — great for section-heavy products.',
    '**Density variant**: `full` — all items shown as text; `burger` — collapses whatever didn’t fit into one menu item; `mini` — icons only, no labels at all. The narrower the screen or the more items there are, the sooner you need to collapse.',
    'The mobile default of recent years: a floating bar at the bottom (in the thumb zone) with 3–4 main items + a burger for the rest — that’s exactly how the bottom bar in this very app is built.',
  ],
  examples: [
    { kind: 'bad', caption: '7 text items in a fixed row — they don’t fit', visual: 'nav-bad' },
    { kind: 'good', caption: 'Floating pill: 3 icons + a "More" burger', visual: 'nav-good' },
  ],
  exercises: [
    {
      id: 'nb-choose-1',
      type: 'choose',
      prompt:
        'A mobile screen (375px), 7 sections in the menu. How best to assemble the navigation?',
      options: [
        {
          id: 'a',
          label: 'A normal row with all 7 as text, across the full top of the screen',
          hint: '7 text items physically don’t fit in 375px — some will get cut off.',
        },
        {
          id: 'b',
          label: 'Floating at the bottom: 3–4 main items as icons + a "More" burger for the rest',
        },
        {
          id: 'c',
          label: 'A sidebar on the left, always expanded',
          hint: 'On a narrow screen a sidebar eats almost all the content width.',
        },
        {
          id: 'd',
          label: 'Fixed on top, all 7 items in a smaller font',
          hint: 'Shrinking the font to unreadable isn’t a solution — the items still won’t fit.',
        },
      ],
      correctOptionId: 'b',
      explanation:
        'On a narrow screen with a long list of sections, this pairing works: a few main items as icons in a floating bar (usually at the bottom, in the thumb zone) + a burger where everything else goes.',
    },
    {
      id: 'nb-choose-2',
      type: 'choose',
      prompt:
        'A desktop documentation site: long pages, many sections and subsections, read for a long time. Where do you keep the navigation?',
      options: [
        {
          id: 'a',
          label: 'Floating on top with a dropdown menu',
          hint: 'Works for 3–5 top-level items, but not for a tree of documentation sections.',
        },
        {
          id: 'b',
          label: 'Fixed on top for the whole list of sections',
          hint: 'A full-height fixed header loses vertical reading space — and here you read a lot.',
        },
        { id: 'c', label: 'A sidebar on the left, sections always in view' },
        {
          id: 'd',
          label: 'Floating at the bottom, like in a mobile app',
          hint: 'On a wide desktop screen it gives no room for a tree of sections and looks like a mobile pattern out of context.',
        },
      ],
      correctOptionId: 'c',
      explanation:
        'For section-heavy documentation on desktop a sidebar is the standard: there’s room, all sections stay in view constantly, and the page’s vertical space isn’t spent on a header.',
    },
    {
      id: 'nb-build-1',
      type: 'bar-build',
      prompt:
        'Assemble a documentation-site header: normal flow (not floating, not fixed), logo on the left, full menu with no burger, with search. No action button and no avatar needed.',
      target: {
        placement: 'static',
        variant: 'full',
        parts: { logo: true, nav: true, search: true, cta: false, avatar: false },
        navAlign: 'left',
      },
      explanation:
        'Docs don’t need to take up height with a fixed header — `static` scrolls out of view, which is fine for long reading. A full menu + search help find a section, while a CTA and profile are beside the point here.',
    },
  ],
  masteryChallenge: {
    id: 'nb-bar-mastery',
    type: 'bar-build',
    prompt:
      'Assemble a mobile app header with a user profile: pinned on top (fixed) — scrollable content opens beneath it. Space is tight, so the navigation is collapsed into a burger. You need the logo and avatar; no search and no action button.',
    target: {
      placement: 'fixedTop',
      variant: 'burger',
      parts: { logo: true, nav: true, search: false, cta: false, avatar: true },
      navAlign: 'left',
    },
    explanation:
      '`fixedTop` keeps the brand and profile in view on any scroll, and the burger hides the menu items that wouldn’t fit in a single row — exactly the combination mobile apps with an always-visible profile choose.',
  },
};
