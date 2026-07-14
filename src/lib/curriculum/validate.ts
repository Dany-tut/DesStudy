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
  EasingAnswer,
  TapTargetAnswer,
} from './types';
import { FIX_DEFECTS, fixSolvedCount, type FixScreenAnswer } from './fixScreen';
import {
  critiqueSolved,
  rebuiltCount,
  defectiveZones,
  emptyCritiqueAnswer,
  type CritiqueAnswer,
} from './screenCritique';
import { SPOT_ROUNDS } from './spotDiff';

/** Per-axis tolerance when matching an easing curve's control points. */
export const EASING_TOL = 0.12;

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
      const navOk = a.navAlign === t.navAlign;
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
        } else if (!navOk) {
          const navLabel = { left: 'слева', center: 'по центру', right: 'справа' } as const;
          hint = `Навигацию выровняй ${navLabel[t.navAlign]}.`;
        }
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
    case 'match': {
      const matched = Array.isArray(answer) ? (answer as string[]) : [];
      const total = exercise.pairs.length;
      const correct = matched.length === total;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct ? undefined : `Сопоставлено ${matched.length} из ${total} — соедини оставшиеся пары.`,
      };
    }
    case 'states': {
      const visited = Array.isArray(answer) ? (answer as string[]) : [];
      const correct = STATE_KEYS.every((k) => visited.includes(k));
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : `Осмотрено ${visited.length} из ${STATE_KEYS.length} состояний — открой каждое.`,
      };
    }
    case 'hotspot': {
      const p = (answer ?? {}) as { x?: number; y?: number };
      const z = exercise.zone;
      const correct =
        typeof p.x === 'number' &&
        typeof p.y === 'number' &&
        p.x >= z.x0 &&
        p.x <= z.x1 &&
        p.y >= z.y0 &&
        p.y <= z.y1;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct ? undefined : exercise.hint ?? 'Не тут — посмотри внимательнее на элементы действия.',
      };
    }
    case 'align': {
      const a = (answer ?? {}) as Partial<AlignAnswer>;
      const t = exercise.target;
      const xOk = a.x === t.x;
      const yOk = a.y === t.y;
      const correct = xOk && yOk;
      const xLabel = { left: 'по левому краю', center: 'по центру', right: 'по правому краю' };
      const yLabel = { top: 'по верху', middle: 'посередине', bottom: 'по низу' };
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : `Нужно выровнять ${xLabel[t.x]} · ${yLabel[t.y]}. Тащи карточку к нужным направляющим.`,
      };
    }
    case 'contrast-tune': {
      const a = (answer ?? {}) as Partial<ContrastAnswer>;
      const ratio = contrastRatio(Number(a.textL ?? 0), Number(a.bgL ?? 0));
      const correct = ratio >= exercise.targetRatio;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : `Сейчас ${ratio.toFixed(2)}:1 — нужно минимум ${exercise.targetRatio}:1. Разведи светлоту текста и фона.`,
      };
    }
    case 'scale-ramp': {
      const a = (answer ?? {}) as Partial<ScaleRampAnswer>;
      const baseOk = Number(a.base) === exercise.targetBase;
      const ratioOk = Number(a.ratio) === exercise.targetRatio;
      const correct = baseOk && ratioOk;
      let hint: string | undefined;
      if (!correct) {
        const parts: string[] = [];
        if (!baseOk) parts.push(`базовый размер должен быть ${exercise.targetBase}px`);
        if (!ratioOk) parts.push(`соотношение — ${exercise.targetRatio}`);
        hint = parts.join('; ') + '.';
      }
      return { correct, explanation: exercise.explanation, hint };
    }
    case 'trim-zone': {
      const trim = Number(answer);
      const correct = Math.abs(trim - exercise.targetTrim) <= exercise.tolerance;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : trim < exercise.targetTrim
            ? 'Ещё осталось лишнее поле шрифта сверху и снизу — подрежь сильнее.'
            : 'Перебор — ты срезал уже сами буквы. Отпусти немного назад.',
      };
    }
    case 'nested-radius': {
      const inner = Number(answer);
      const target = exercise.outerRadius - exercise.padding;
      const correct = inner === target;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : inner > target
            ? 'Внутренний радиус великоват — дуги не совпадут. Вспомни: внутренний = внешний − отступ.'
            : 'Внутренний радиус маловат — угол кнопки острее угла карточки.',
      };
    }
    case 'resize-frame': {
      const width = Number(answer);
      const correct = Math.abs(width - exercise.targetWidth) <= exercise.tolerance;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : width < exercise.targetWidth
            ? `Сейчас ${Math.round(width)}px — уже цели ${exercise.targetWidth}px. Потяни рамку шире.`
            : `Сейчас ${Math.round(width)}px — шире цели ${exercise.targetWidth}px. Сузь рамку.`,
      };
    }
    case 'elevation': {
      const level = Number(answer);
      const correct = level === exercise.targetLevel;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : level < exercise.targetLevel
            ? 'Слишком «приземлённо» — подними карточку выше, тень должна стать заметнее.'
            : 'Перебор — карточка парит слишком высоко, тень разъехалась. Опусти на уровень ниже.',
      };
    }
    case 'easing': {
      const a = (answer ?? {}) as Partial<EasingAnswer>;
      const t = exercise.target;
      const near = (p: { x?: number; y?: number } | undefined, q: EasingAnswer['p1']) =>
        p != null &&
        typeof p.x === 'number' &&
        typeof p.y === 'number' &&
        Math.abs(p.x - q.x) <= EASING_TOL &&
        Math.abs(p.y - q.y) <= EASING_TOL;
      const correct = near(a.p1, t.p1) && near(a.p2, t.p2);
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : exercise.hint ??
            `Подведи обе контрольные точки к кривой ${t.name} — следи за сплошной линией поверх пунктирной цели.`,
      };
    }
    case 'spot-diff': {
      const round = SPOT_ROUNDS[exercise.roundId];
      const correct = round != null && Number(answer) === round.oddIndex;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : exercise.hint ?? 'Не эта плитка — приглядись к радиусам, оттенкам, весу и полям.',
      };
    }
    case 'tap-target': {
      const a = (answer ?? {}) as Partial<TapTargetAnswer>;
      const min = exercise.min ?? 44;
      const correct = Number(a.w) >= min && Number(a.h) >= min;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : exercise.hint ?? `Кнопка меньше ${min}×${min}px — потяни угол, пока обе стороны не дорастут до безопасной тап-цели.`,
      };
    }
    case 'fix-screen': {
      const solved = fixSolvedCount(answer as Partial<FixScreenAnswer>);
      const total = FIX_DEFECTS.length;
      const correct = solved === total;
      return {
        correct,
        explanation: exercise.explanation,
        hint: correct
          ? undefined
          : `Исправлено ${solved} из ${total} — пройди по оставшимся нарушениям и выбери правильный вариант.`,
      };
    }
  }
}
