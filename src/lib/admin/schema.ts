/**
 * Hand-rolled validation for teacher-authored content — matches the existing
 * codebase convention (see src/app/api/attempt/route.ts) rather than adding a
 * new dependency like zod. Every ContentBlock payload is parsed through here
 * before being written to the DB, so `src/lib/curriculum/types.ts` stays the
 * single source of truth for shape (no parallel Prisma-model-per-exercise-type).
 */
import type { Exercise, LessonVideo, CritiqueZone, CritiqueRoleId, CritiqueDefectId } from '@/lib/curriculum/types';
import { CRITIQUE_ROLES, CRITIQUE_DEFECTS, CRITIQUE_SCENES } from '@/lib/curriculum/screenCritique';

export class ValidationError extends Error {}

function str(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.trim() === '') {
    throw new ValidationError(`${field}: обязательное поле`);
  }
  return v;
}

function optionalStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

/** Lenient text — blocks are created empty and filled in right after, so
 * content fields (prompt/explanation/labels) can't require non-empty the way
 * structural fields (id, correctOptionId) do. */
function text(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown, field: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new ValidationError(`${field}: должно быть числом`);
  return n;
}

function arr(v: unknown, field: string): unknown[] {
  if (!Array.isArray(v)) throw new ValidationError(`${field}: должно быть списком`);
  return v;
}

/** Parses+validates one exercise payload (any of the 6 Exercise types). */
export function parseExercise(data: Record<string, unknown>): Exercise {
  const id = str(data.id, 'id');
  const prompt = text(data.prompt);
  const explanation = text(data.explanation);

  switch (data.type) {
    case 'choose': {
      const options = arr(data.options, 'options').map((raw, i) => {
        const o = raw as Record<string, unknown>;
        return {
          id: str(o.id ?? `opt-${i}`, `options[${i}].id`),
          label: text(o.label),
          hint: optionalStr(o.hint),
        };
      });
      if (options.length < 2) throw new ValidationError('choose: нужно минимум 2 варианта');
      const correctOptionId = str(data.correctOptionId, 'correctOptionId');
      if (!options.some((o) => o.id === correctOptionId)) {
        throw new ValidationError('correctOptionId должен совпадать с id одного из options');
      }
      return { id, type: 'choose', prompt, options, correctOptionId, explanation };
    }
    case 'tune': {
      return {
        id,
        type: 'tune',
        prompt,
        unitLabel: text(data.unitLabel) || 'px',
        min: num(data.min, 'min'),
        max: num(data.max, 'max'),
        step: num(data.step, 'step'),
        correctValue: num(data.correctValue, 'correctValue'),
        tolerance: num(data.tolerance ?? 0, 'tolerance'),
        visual: data.visual === 'radius' ? 'radius' : 'slider',
        explanation,
      };
    }
    case 'build': {
      const target = (data.target ?? {}) as Record<string, unknown>;
      return {
        id,
        type: 'build',
        prompt,
        blocks: num(data.blocks, 'blocks'),
        step: num(data.step, 'step'),
        min: num(data.min, 'min'),
        max: num(data.max, 'max'),
        target: { gap: num(target.gap, 'target.gap'), padding: num(target.padding, 'target.padding') },
        explanation,
      };
    }
    case 'order': {
      const items = arr(data.items, 'items').map((raw, i) => {
        const it = raw as Record<string, unknown>;
        return {
          id: str(it.id ?? `item-${i}`, `items[${i}].id`),
          label: text(it.label),
          size: it.size as 'display' | 'title' | 'body' | 'caption' | 'button' | undefined,
        };
      });
      if (items.length < 2) throw new ValidationError('order: нужно минимум 2 элемента');
      const correctOrder = arr(data.correctOrder, 'correctOrder') as string[];
      const itemIds = new Set(items.map((it) => it.id));
      if (
        correctOrder.length !== items.length ||
        !correctOrder.every((id2) => itemIds.has(id2))
      ) {
        throw new ValidationError('correctOrder должен содержать все id из items ровно один раз');
      }
      return { id, type: 'order', prompt, items, correctOrder, explanation };
    }
    case 'figma-link': {
      return {
        id,
        type: 'figma-link',
        prompt,
        checklist: (arr(data.checklist ?? [], 'checklist') as string[]).filter(Boolean),
        explanation,
      };
    }
    case 'file-upload': {
      return {
        id,
        type: 'file-upload',
        prompt,
        accept: text(data.accept) || 'image/png,image/jpeg,application/pdf',
        maxSizeMB: num(data.maxSizeMB, 'maxSizeMB'),
        checklist: (arr(data.checklist ?? [], 'checklist') as string[]).filter(Boolean),
        explanation,
      };
    }
    case 'screen-critique': {
      const scene = str(data.scene, 'scene');
      if (!(CRITIQUE_SCENES as readonly string[]).includes(scene)) {
        throw new ValidationError(`Неизвестная сцена: ${scene}`);
      }
      const roleIds = new Set(CRITIQUE_ROLES.map((r) => r.id));
      const defectIds = new Set(CRITIQUE_DEFECTS.map((d) => d.id));
      const zones: CritiqueZone[] = arr(data.zones, 'zones').map((raw, i) => {
        const z = raw as Record<string, unknown>;
        const role = str(z.role, `zones[${i}].role`) as CritiqueRoleId;
        if (!roleIds.has(role)) throw new ValidationError(`zones[${i}].role: неизвестная роль`);
        const defect = str(z.defect, `zones[${i}].defect`) as CritiqueDefectId;
        if (!defectIds.has(defect)) throw new ValidationError(`zones[${i}].defect: неизвестный дефект`);
        const fixesRaw = z.fixes ? arr(z.fixes, `zones[${i}].fixes`) : [];
        const fixes = fixesRaw.map((fr, j) => {
          const f = fr as Record<string, unknown>;
          return { id: str(f.id ?? `fix-${j}`, `zones[${i}].fixes[${j}].id`), label: text(f.label), correct: !!f.correct };
        });
        if (defect !== 'none' && fixes.length > 0) {
          const correct = fixes.filter((f) => f.correct).length;
          if (correct !== 1) {
            throw new ValidationError(`zones[${i}]: должно быть ровно одно верное исправление`);
          }
        }
        const asIds = (v: unknown): CritiqueDefectId[] | undefined =>
          Array.isArray(v) ? (v as CritiqueDefectId[]) : undefined;
        const r = z.rect as Record<string, unknown> | undefined;
        const rect =
          r && ['x0', 'y0', 'x1', 'y1'].every((k) => Number.isFinite(Number(r[k])))
            ? { x0: Number(r.x0), y0: Number(r.y0), x1: Number(r.x1), y1: Number(r.y1) }
            : undefined;
        return {
          id: str(z.id, `zones[${i}].id`),
          label: text(z.label),
          role,
          debatableRoles: Array.isArray(z.debatableRoles) ? (z.debatableRoles as CritiqueRoleId[]) : undefined,
          roleNote: text(z.roleNote),
          intent: text(z.intent),
          defect,
          debatableDefects: asIds(z.debatableDefects),
          defectNote: text(z.defectNote),
          fixes: fixes.length ? fixes : undefined,
          rect,
          layerId: optionalStr(z.layerId),
        };
      });
      if (zones.length === 0) throw new ValidationError('screen-critique: нужна хотя бы одна зона');
      let image: { url: string; goodUrl?: string } | undefined;
      if (scene === 'image') {
        const img = (data.image ?? {}) as Record<string, unknown>;
        image = { url: str(img.url, 'image.url'), goodUrl: optionalStr(img.goodUrl) };
        if (zones.some((z) => !z.rect)) {
          throw new ValidationError('image-сцена: у каждой зоны должна быть рамка (rect)');
        }
      }
      let svg: string | undefined;
      if (scene === 'svg') {
        svg = str(data.svg, 'svg');
        if (zones.some((z) => !z.rect)) {
          throw new ValidationError('svg-сцена: у каждой зоны должна быть рамка (rect)');
        }
      }
      return {
        id,
        type: 'screen-critique',
        prompt,
        scene,
        image,
        svg,
        screenTitle: text(data.screenTitle),
        zones,
        explanation,
      };
    }
    default:
      throw new ValidationError(`Неизвестный тип упражнения: ${String(data.type)}`);
  }
}

/** Lenient like parseTheoryText — a video block starts empty and gets filled in. */
export function parseVideo(data: Record<string, unknown>): LessonVideo {
  const provider = data.provider;
  return {
    url: typeof data.url === 'string' ? data.url : '',
    caption: typeof data.caption === 'string' ? data.caption : '',
    provider:
      provider === 'youtube' || provider === 'vimeo' || provider === 'file' ? provider : undefined,
  };
}

/** Lenient on purpose — a theory block is created empty and filled in right
 * after, so it can't require non-empty text the way exercise fields do. */
export function parseTheoryText(data: Record<string, unknown>): string {
  return typeof data.text === 'string' ? data.text : '';
}

const DIFFICULTIES = ['intro', 'easy', 'medium', 'hard'];

export interface LessonMetaInput {
  title: string;
  pathTitle: string;
  skill: string;
  difficulty: string;
  estimatedMinutes: number;
  objectives: string[];
  prerequisites: string[];
}

/** Validates the lesson-level metadata form (everything except blocks). */
export function parseLessonMeta(data: Record<string, unknown>): LessonMetaInput {
  const difficulty = str(data.difficulty, 'difficulty');
  if (!DIFFICULTIES.includes(difficulty)) {
    throw new ValidationError(`difficulty должен быть одним из: ${DIFFICULTIES.join(', ')}`);
  }
  return {
    title: str(data.title, 'title'),
    pathTitle: str(data.pathTitle, 'pathTitle'),
    skill: str(data.skill, 'skill'),
    difficulty,
    estimatedMinutes: num(data.estimatedMinutes, 'estimatedMinutes'),
    objectives: (arr(data.objectives ?? [], 'objectives') as string[]).filter(Boolean),
    prerequisites: (arr(data.prerequisites ?? [], 'prerequisites') as string[]).filter(Boolean),
  };
}

/** Slug rule: lowercase, digits, single hyphens — matches existing static lesson slugs. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}
