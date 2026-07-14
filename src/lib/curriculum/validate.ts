/**
 * Deterministic validation engine (L0/L1).
 * The validator decides correctness from data alone — the AI Mentor never
 * decides whether an answer is right, it only explains the validator's verdict.
 */
import type {
  Exercise,
  ValidationOutcome,
  BuildAnswer,
  BarBuildAnswer,
  BarPartKey,
  AlignAnswer,
  ContrastAnswer,
  ScaleRampAnswer,
} from './types';

/** Interaction states inspected in a `states` exercise (must match StatesLab). */
export const STATE_KEYS = ['default', 'hover', 'active', 'focus', 'disabled'] as const;

/** WCAG relative luminance for a neutral grey given lightness 0..100. */
export function luminanceFromLightness(lightness: number): number {
  const s = Math.round((lightness / 100) * 255) / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG contrast ratio between two neutral greys given their lightness 0..100. */
export function contrastRatio(textL: number, bgL: number): number {
  const a = luminanceFromLightness(textL);
  const b = luminanceFromLightness(bgL);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

const PLACEMENT_LABEL: Record<BarBuildAnswer['placement'], string> = {
  static: 'статичный',
  fixedTop: 'фиксированный сверху',
  floatTop: 'плавающий сверху',
  floatBottom: 'плавающий снизу',
  sidebarLeft: 'боковой слева',
  sidebarRight: 'боковой справа',
};
const VARIANT_LABEL: Record<BarBuildAnswer['variant'], string> = {
  full: 'полный',
  burger: 'бургер',
  mini: 'мини',
};

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
    case 'bar-build': {
      const a = (answer ?? {}) as Partial<BarBuildAnswer>;
      const t = exercise.target;
      const placementOk = a.placement === t.placement;
      const variantOk = a.variant === t.variant;
      const navOk = a.navCenter === t.navCenter;
      const partsOk =
        !!a.parts &&
        (Object.keys(t.parts) as BarPartKey[]).every((k) => a.parts?.[k] === t.parts[k]);
      const correct = placementOk && variantOk && navOk && partsOk;

      let hint: string | undefined;
      if (!correct) {
        // Surface the most structural mismatch first: placement → variant →
        // parts → nav alignment.
        if (!placementOk) hint = `Бар должен быть «${PLACEMENT_LABEL[t.placement]}».`;
        else if (!variantOk) hint = `Нужен вид «${VARIANT_LABEL[t.variant]}».`;
        else if (!partsOk) {
          const missing = (Object.keys(t.parts) as BarPartKey[]).filter(
            (k) => t.parts[k] && !a.parts?.[k],
          );
          const extra = (Object.keys(t.parts) as BarPartKey[]).filter(
            (k) => !t.parts[k] && a.parts?.[k],
          );
          const labels: Record<BarPartKey, string> = {
            logo: 'логотип',
            nav: 'навигация',
            search: 'поиск',
            cta: 'кнопка CTA',
            avatar: 'профиль',
          };
          const parts: string[] = [];
          if (missing.length) parts.push(`не хватает: ${missing.map((k) => labels[k]).join(', ')}`);
          if (extra.length) parts.push(`лишнее: ${extra.map((k) => labels[k]).join(', ')}`);
          hint = parts.join('; ') + '.';
        } else if (!navOk)
          hint = t.navCenter ? 'Навигацию поставь по центру.' : 'Навигацию выровняй слева.';
      }
      return { correct, explanation: exercise.explanation, hint };
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
