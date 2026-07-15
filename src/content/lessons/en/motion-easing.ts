import type { Lesson } from '@/lib/curriculum/types';

/**
 * UI Foundations — motion easing: linear vs ease-out/ease-in/ease-in-out,
 * when each fits, and reading them as cubic-bezier control points.
 */
export const motionEasingEn: Lesson = {
  id: 'motion-easing',
  slug: 'motion-easing',
  title: 'Animation curves: easing',
  pathTitle: 'UI Foundations',
  skill: 'motion',
  difficulty: 'medium',
  estimatedMinutes: 10,
  objectives: [
    'Tell linear from ease-out, ease-in and ease-in-out by eye',
    'Match a curve to the character of the motion: entering, leaving, moving across the screen',
    'Read easing as two cubic-bezier control points',
  ],
  prerequisites: ['nav-bars'],
  theory: [
    'Animation is not only "how long", but also **how** an element travels its path. The speed within the motion is set by the **easing** (the acceleration curve). `linear` moves at the same speed from start to finish — and so it feels mechanical: nothing in nature moves like that.',
    '**ease-out** starts fast and gently brakes toward the end — it’s the language of **entering** elements: a popup, a sheet, a new screen fly in decisively and land smoothly. **ease-in** is the opposite: it starts slowly and accelerates toward the end — fitting for **removing** elements from the screen, as if they’re rushing away. **ease-in-out** accelerates smoothly and brakes smoothly — for **moves within the screen**, when an object is already there and simply travels from point to point.',
    'Under the hood it’s all `cubic-bezier`: a curve defined by two control points `p1` and `p2` in a square from 0 to 1. The ends of the curve are fixed at (0,0) and (1,1), and the points pull its shape. For example, ease-out is `cubic-bezier(0, 0, 0.58, 1)`: `p1` at the origin, `p2` high and to the right. By moving these two points, you "draw" the character of the motion — a sharp entry, a smooth glide, or a rushing-away exit.',
  ],
  examples: [
    { kind: 'bad', caption: 'linear: moves mechanically, without "weight"', visual: 'nav-bad' },
    { kind: 'good', caption: 'ease-out: a decisive entry, a soft landing', visual: 'nav-good' },
  ],
  exercises: [
    {
      id: 'me-choose-1',
      type: 'choose',
      prompt:
        'A modal window appears over the screen. Which easing feels most natural for its appearance?',
      options: [
        { id: 'a', label: 'ease-out — fast start, gentle braking' },
        { id: 'b', label: 'linear — constant speed', hint: 'A flat speed reads as mechanical, with no "landing".' },
        { id: 'c', label: 'ease-in — slow start, accelerating to the end', hint: 'ease-in fits an element leaving, not appearing.' },
        { id: 'd', label: 'no animation — instantly in place', hint: 'A sharp jump loses the sense of appearance and the link between states.' },
      ],
      correctOptionId: 'a',
      explanation:
        'Entering elements almost always use ease-out: they appear decisively and gently "land". ease-in is left for leaving, and linear feels lifeless.',
    },
    {
      id: 'me-easing-1',
      type: 'easing',
      prompt:
        'Build the ease-out curve: drag the control points so the motion starts fast and brakes gently toward the end.',
      target: { name: 'ease-out', p1: { x: 0, y: 0 }, p2: { x: 0.58, y: 1 } },
      hint: 'Leave the first point at the origin (0,0), and pull the second one high up and to the right — roughly to (0.58, 1).',
      explanation:
        'ease-out is cubic-bezier(0, 0, 0.58, 1). The first point at (0,0) gives a fast start, the second near the top — a smooth braking at the end. Exactly what entering elements need.',
    },
    {
      id: 'me-easing-2',
      type: 'easing',
      prompt:
        'Build the ease-in-out curve: a symmetric smooth acceleration at the start and smooth braking at the end — for moving an object within the screen.',
      target: { name: 'ease-in-out', p1: { x: 0.42, y: 0 }, p2: { x: 0.58, y: 1 } },
      hint: 'The curve is symmetric: shift the first point right along the bottom (about 0.42, 0), and the second left along the top (about 0.58, 1).',
      explanation:
        'ease-in-out is cubic-bezier(0.42, 0, 0.58, 1). Both points pull the curve toward the center, so the motion smoothly accelerates and just as smoothly brakes. It’s the language of moves: the object is already on screen and neatly travels from point to point.',
    },
  ],
  masteryChallenge: {
    id: 'me-easing-mastery',
    type: 'easing',
    prompt:
      'A toast slides off past the bottom edge of the screen. Build the ease-in curve: a slow start and acceleration to the end, as if the element is rushing away.',
    target: { name: 'ease-in', p1: { x: 0.42, y: 0 }, p2: { x: 1, y: 1 } },
    hint: 'Shift the first point right along the bottom (about 0.42, 0), and leave the second in the far top corner (1, 1).',
    explanation:
      'ease-in is cubic-bezier(0.42, 0, 1, 1). The flat start gives a slow take-off, and the acceleration to the end sends the element past the edge: exactly how disappearing elements should leave, mirroring ease-out for appearing.',
  },
};
