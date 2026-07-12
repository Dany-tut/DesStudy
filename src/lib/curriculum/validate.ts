/**
 * Deterministic validation engine (L0/L1).
 * The validator decides correctness from data alone — the AI Mentor never
 * decides whether an answer is right, it only explains the validator's verdict.
 */
import type { Exercise, ValidationOutcome, BuildAnswer } from './types';

/** Shared with the FigmaLinkSubmit UI so validation and live-feedback never drift apart. */
export const FIGMA_URL_PATTERN = /^https:\/\/(www\.)?figma\.com\/(file|design|proto)\/[a-zA-Z0-9]+/;

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
    case 'figma-link': {
      const url = typeof answer === 'string' ? answer.trim() : '';
      const validShape = FIGMA_URL_PATTERN.test(url);
      return {
        correct: validShape,
        reviewRequired: validShape,
        explanation: exercise.explanation,
        hint: validShape
          ? undefined
          : 'Похоже, это не ссылка на файл Figma — скопируй адрес через Share → Copy link.',
      };
    }
    case 'file-upload': {
      const submitted = typeof answer === 'string' && answer.length > 0;
      return {
        correct: submitted,
        reviewRequired: submitted,
        explanation: exercise.explanation,
        hint: submitted ? undefined : 'Прикрепи файл, прежде чем отправлять на проверку.',
      };
    }
    case 'order': {
      const order = Array.isArray(answer) ? (answer as string[]) : [];
      const correct =
        order.length === exercise.correctOrder.length &&
        order.every((id, i) => id === exercise.correctOrder[i]);
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : 'Порядок пока неверный — что должно привлекать внимание первым, а что последним?',
      };
    }
  }
}
