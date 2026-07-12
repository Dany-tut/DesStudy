/**
 * Deterministic validation engine (L0/L1).
 * The validator decides correctness from data alone — the AI Mentor never
 * decides whether an answer is right, it only explains the validator's verdict.
 */
import type { Exercise, ValidationOutcome } from './types';

export function validate(exercise: Exercise, answer: unknown): ValidationOutcome {
  switch (exercise.type) {
    case 'choose': {
      const chosen = exercise.options.find((o) => o.id === answer);
      const correct = answer === exercise.correctOptionId;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct ? undefined : chosen?.hint,
      };
    }
    case 'tune': {
      const value = Number(answer);
      const correct = Math.abs(value - exercise.correctValue) <= exercise.tolerance;
      const offGrid = value % exercise.step !== 0;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : offGrid
            ? `Значение ${value}${exercise.unitLabel} не лежит на сетке (шаг ${exercise.step}${exercise.unitLabel}).`
            : `Почти — цель ${exercise.correctValue}${exercise.unitLabel}.`,
      };
    }
  }
}
