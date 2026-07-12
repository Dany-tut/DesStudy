/**
 * DesStudy — Curriculum domain model.
 * ===================================
 * These types are the shape of the learning content. They map 1:1 onto the
 * future Prisma schema (Path → Course → Module → Lesson → Exercise → Attempt).
 * For now content lives as code (src/content), so we can build the core loop
 * before wiring a database.
 */

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
  explanation: string;
}

export type Exercise = ChooseExercise | TuneExercise;

// ─────────────────────────────────────────────────────────────
// LESSON — follows PRD Chapter 5 lesson structure.
// ─────────────────────────────────────────────────────────────

export interface LessonExample {
  kind: 'good' | 'bad';
  caption: string;
  /** Component key rendered by the example renderer. */
  visual: string;
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
}
