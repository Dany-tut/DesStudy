/**
 * DesStudy — Curriculum domain model.
 * ===================================
 * These types are the shape of the learning content. They map 1:1 onto the
 * future Prisma schema (Path → Course → Module → Lesson → Exercise → Attempt).
 * For now content lives as code (src/content), so we can build the core loop
 * before wiring a database.
 */

import type { LucideIcon } from 'lucide-react';

export type Difficulty = 'intro' | 'easy' | 'medium' | 'hard';

// ─────────────────────────────────────────────────────────────
// EXERCISES — discriminated union. New exercise types extend this.
// Every exercise validates deterministically at L0/L1 (no AI needed
// to decide correctness — AI only explains).
// ─────────────────────────────────────────────────────────────

/** L0: pick the single correct option among several. */
export interface ChooseExercise {
  id: string;
  type: 'choose';
  prompt: string;
  /** Optional visual rendered above the options (component key). */
  visual?: string;
  /**
   * How the options are rendered. 'cards' (default) — ChoiceCard list.
   * 'tiles' — TilePicker (icon glyph per option). 'swatches' — SwatchPicker
   * (colored circle per option, for answers tied to a visual sample).
   * 'segmented' — SegmentedControl (compact pill row; best for 2–3 short
   * mutually-exclusive labels).
   */
  picker?: 'cards' | 'tiles' | 'swatches' | 'segmented';
  options: ChooseOption[];
  /** id of the correct option */
  correctOptionId: string;
  /** Shown after any answer — the "why". */
  explanation: string;
}

export interface ChooseOption {
  id: string;
  label: string;
  /** Optional per-option hint shown when this wrong answer is picked. */
  hint?: string;
  /** For picker: 'tiles' — the glyph shown on the tile. */
  icon?: LucideIcon;
  /** For picker: 'swatches' — CSS color/background for the swatch circle. */
  swatch?: string;
}

/** L1: adjust a numeric value onto the correct grid step (e.g. spacing). */
export interface TuneExercise {
  id: string;
  type: 'tune';
  prompt: string;
  unitLabel: string; // e.g. "px"
  min: number;
  max: number;
  step: number;
  /** The exact correct value (must sit on the grid). */
  correctValue: number;
  /** Acceptable absolute tolerance (0 = exact). */
  tolerance: number;
  /**
   * How the learner manipulates the value. 'slider' (default) — linear drag.
   * 'radius' — a live corner-drag card, snapping to the radius token scale
   * (matches the direct-manipulation feel of BuildExercise's canvas).
   */
  visual?: 'slider' | 'radius';
  explanation: string;
}

/**
 * L1: build on the Interactive Canvas. The learner constructs an auto-layout
 * card (gap + padding) and the Geometry Engine validates it against a target,
 * deterministically, on our own data — no Figma, no vision model needed.
 */
export interface BuildExercise {
  id: string;
  type: 'build';
  prompt: string;
  /** Number of stacked blocks in the card preview. */
  blocks: number;
  /** Grid step the controls snap to (e.g. 4 for the 8pt half-step). */
  step: number;
  min: number;
  max: number;
  /** Target auto-layout the learner must reproduce. */
  target: BuildAnswer;
  explanation: string;
}

/** The learner's canvas state for a build exercise. */
export interface BuildAnswer {
  gap: number;
  padding: number;
}

/**
 * L1: drag-to-reorder on the canvas. The learner drags items into the correct
 * visual order (e.g. fixing typographic hierarchy). Validated deterministically
 * by comparing the arranged order to the target.
 */
export interface OrderExercise {
  id: string;
  type: 'order';
  prompt: string;
  /** Items in their initial (shuffled) presentation order. */
  items: OrderItem[];
  /** Correct order, top → bottom, as item ids. */
  correctOrder: string[];
  explanation: string;
}

export interface OrderItem {
  id: string;
  label: string;
  /** Rendered size hint so the card visually reads like the element it is. */
  size?: 'display' | 'title' | 'body' | 'caption' | 'button';
}

/**
 * L2: submit a link to a real Figma file/frame for the described task.
 * Cannot be graded correct/incorrect without a vision model (deliberately out
 * of scope, same reasoning as BuildExercise above) — only the URL shape is
 * validated. The learner's design itself goes to human/mentor review.
 */
export interface FigmaLinkExercise {
  id: string;
  type: 'figma-link';
  prompt: string;
  /** What the reviewer (or the learner, self-checking) should look for. */
  checklist: string[];
  explanation: string;
}

/**
 * L2: attach a file (screenshot, export, PDF) for the described task. Same
 * review-not-grade reasoning as FigmaLinkExercise.
 */
export interface FileUploadExercise {
  id: string;
  type: 'file-upload';
  prompt: string;
  /** HTML `accept` attribute value, e.g. "image/*,.pdf". */
  accept: string;
  maxSizeMB: number;
  checklist: string[];
  explanation: string;
}

/**
 * L1: assemble a navigation/top bar like a constructor. The learner picks how
 * the bar sits on the page, its compact variant, which parts are in it, and how
 * the nav aligns — then it's validated deterministically against a target
 * config. The live preview is a real scrollable page so positioning is felt.
 */
export interface BarBuildExercise {
  id: string;
  type: 'bar-build';
  prompt: string;
  /** Target config the learner must reproduce. */
  target: BarBuildAnswer;
  explanation: string;
}

export type BarPlacement =
  | 'static'
  | 'fixedTop'
  | 'floatTop'
  | 'floatBottom'
  | 'sidebarLeft'
  | 'sidebarRight';
export type BarVariant = 'full' | 'burger' | 'mini';
export type BarPartKey = 'logo' | 'nav' | 'search' | 'cta' | 'avatar';

/** The learner's assembled bar for a bar-build exercise. */
export interface BarBuildAnswer {
  placement: BarPlacement;
  variant: BarVariant;
  parts: Record<BarPartKey, boolean>;
  navAlign: 'left' | 'center' | 'right';
}

/**
 * L1: connect each item in the left column to its match in the right column by
 * tapping. Validated deterministically — correct once every pair is matched.
 * (Promoted from the design-system draft "MatchPairs".)
 */
export interface MatchExercise {
  id: string;
  type: 'match';
  prompt: string;
  pairs: MatchPair[];
  explanation: string;
}

export interface MatchPair {
  id: string;
  /** Left-column token/label. */
  left: string;
  /** Right-column value/label it maps to. */
  right: string;
}

/**
 * L1: inspect every interaction state (default/hover/active/focus/disabled) of a
 * live component. An exploration exercise — correct once all states are visited.
 * (Promoted from the draft "StatesLab".)
 */
export interface StatesExercise {
  id: string;
  type: 'states';
  prompt: string;
  explanation: string;
}

/**
 * L1: click the problem area on a mockup. Validated by whether the click lands
 * inside the target zone (percentages of the mockup box). (Promoted from
 * the draft "Hotspot".)
 */
export interface HotspotExercise {
  id: string;
  type: 'hotspot';
  prompt: string;
  /** Target zone in % of the mockup: [x0,y0] top-left → [x1,y1] bottom-right. */
  zone: { x0: number; y0: number; x1: number; y1: number };
  /** Which mockup scene to render. */
  scene?: 'tap-target';
  hint?: string;
  explanation: string;
}

/**
 * L1: drag a card so it snaps to the requested alignment (x: left/center/right,
 * y: top/middle/bottom) on an 8pt grid. (Promoted from the draft "AlignSnap".)
 */
export interface AlignExercise {
  id: string;
  type: 'align';
  prompt: string;
  target: AlignAnswer;
  explanation: string;
}

export interface AlignAnswer {
  x: 'left' | 'center' | 'right';
  y: 'top' | 'middle' | 'bottom';
}

/**
 * L1: tune text/background lightness until the WCAG contrast ratio reaches the
 * target (e.g. 4.5 for AA). (Promoted from the draft "ContrastTuner".)
 */
export interface ContrastTuneExercise {
  id: string;
  type: 'contrast-tune';
  prompt: string;
  /** Minimum contrast ratio to reach, e.g. 4.5 (AA) or 7 (AAA). */
  targetRatio: number;
  explanation: string;
}

export interface ContrastAnswer {
  textL: number;
  bgL: number;
}

/**
 * L1: pick a base body size and a modular ratio so the type scale matches the
 * target. (Promoted from the draft "ScaleRamp".)
 */
export interface ScaleRampExercise {
  id: string;
  type: 'scale-ramp';
  prompt: string;
  targetBase: number;
  targetRatio: number;
  explanation: string;
}

export interface ScaleRampAnswer {
  base: number;
  ratio: number;
}

/**
 * L1: repair a deliberately broken mobile mockup by picking the correct fix for
 * each flagged defect (radius, iconography, active state, brand token, spacing,
 * CTA). The defect spec lives in `./fixScreen`; correct once every defect is
 * fixed. (Promoted from the draft "FixTheScreen".)
 */
export interface FixScreenExercise {
  id: string;
  type: 'fix-screen';
  prompt: string;
  explanation: string;
}

/**
 * L1: trim the invisible extra font space (trim zone) around a text label so its
 * optical padding becomes symmetric — the direct-manipulation version of
 * `text-box-trim`. Correct once the trim reaches the target within tolerance.
 */
export interface TrimZoneExercise {
  id: string;
  type: 'trim-zone';
  /** Label rendered inside the box (e.g. "Submit"). */
  label: string;
  /** Trim amount, in px, that removes the extra space. */
  targetTrim: number;
  /** Max trim on the slider. */
  maxTrim: number;
  tolerance: number;
  prompt: string;
  explanation: string;
}

/**
 * L1: set the radius of a nested element so it is concentric with its container.
 * The learner drags the inner radius; correct when inner = outer − padding.
 */
export interface NestedRadiusExercise {
  id: string;
  type: 'nested-radius';
  /** Container (outer) radius in px. */
  outerRadius: number;
  /** Padding between container and nested element, in px. */
  padding: number;
  /** Max inner radius on the slider. */
  maxRadius: number;
  prompt: string;
  explanation: string;
}

export type Exercise =
  | ChooseExercise
  | TuneExercise
  | BuildExercise
  | OrderExercise
  | FigmaLinkExercise
  | FileUploadExercise
  | BarBuildExercise
  | MatchExercise
  | StatesExercise
  | HotspotExercise
  | AlignExercise
  | ContrastTuneExercise
  | ScaleRampExercise
  | TrimZoneExercise
  | NestedRadiusExercise
  | FixScreenExercise;

// ─────────────────────────────────────────────────────────────
// LESSON — follows PRD Chapter 5 lesson structure.
// ─────────────────────────────────────────────────────────────

export interface LessonExample {
  kind: 'good' | 'bad';
  caption: string;
  /** Component key rendered by the example renderer. */
  visual: string;
}

export interface LessonVideo {
  url: string;
  caption: string;
  provider?: 'youtube' | 'vimeo' | 'file';
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  pathTitle: string;
  /** Skill key for weak/strong-skill analytics, e.g. "spacing". */
  skill: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  objectives: string[];
  prerequisites: string[];
  /** Short, interactive theory — kept minimal by design. */
  theory: string[];
  /** Optional short video(s) — embedded alongside theory. */
  videos?: LessonVideo[];
  examples: LessonExample[];
  exercises: Exercise[];
  masteryChallenge: Exercise;
}

// ─────────────────────────────────────────────────────────────
// ATTEMPTS & PROGRESS — the measurable layer (PRD §7).
// ─────────────────────────────────────────────────────────────

export interface AttemptResult {
  exerciseId: string;
  correct: boolean;
  attempts: number;
}

export interface ValidationOutcome {
  correct: boolean;
  /** Deterministic explanation from the validator (never invented). */
  explanation: string;
  /** Optional targeted hint for the specific wrong answer. */
  hint?: string;
  /**
   * True for submission-style exercises (figma-link/file-upload): `correct`
   * only reflects "a validly-shaped submission was made", not design quality.
   * The player shows a distinct "submitted for review" state instead of a
   * verdict.
   */
  reviewRequired?: boolean;
}
