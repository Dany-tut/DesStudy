/**
 * Deterministic validation engine (L0/L1).
 * The validator decides correctness from data alone — the AI Mentor never
 * decides whether an answer is right, it only explains the validator's verdict.
 */
import type { Exercise, ValidationOutcome, BuildAnswer } from './types';

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
    case 'build': {
      const a = (answer ?? {}) as Partial<BuildAnswer>;
      const gap = Number(a.gap);
      const padding = Number(a.padding);
      const gapOk = gap === exercise.target.gap;
      const padOk = padding === exercise.target.padding;
      const correct = gapOk && padOk;

      let hint: string | undefined;
      if (!correct) {
        const parts: string[] = [];
        if (!gapOk) {
          parts.push(
            gap % 8 !== 0
              ? `отступ ${gap}px не кратен 8`
              : gap < exercise.target.gap
                ? 'отступ между блоками маловат'
                : 'отступ между блоками великоват',
          );
        }
        if (!padOk) {
          parts.push(
            padding % 8 !== 0
              ? `внутренние поля ${padding}px не кратны 8`
              : padding < exercise.target.padding
                ? 'поля тесноваты'
                : 'поля слишком просторны',
          );
        }
        hint = parts.join('; ') + '.';
      }
      return { correct, explanation: exercise.explanation, hint };
    }
  }
}
