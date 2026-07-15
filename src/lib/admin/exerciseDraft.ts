import type { ExerciseDraft } from '@/components/admin/ExerciseFieldsEditor';
import type { CritiqueZone } from '@/lib/curriculum/types';
import {
  premiumCardCritique,
  PREMIUM_CARD_SCREEN_TITLE,
  PREMIUM_CARD_ZONES,
} from '@/lib/curriculum/screenCritique';

function rid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A fresh draft with sane defaults for a newly-added exercise block. */
export function emptyDraft(type: ExerciseDraft['type']): ExerciseDraft {
  const base: ExerciseDraft = {
    type,
    id: rid('ex'),
    prompt: '',
    explanation: '',
    options: [],
    correctOptionId: '',
    unitLabel: 'px',
    min: 0,
    max: 64,
    step: 4,
    correctValue: 16,
    tolerance: 0,
    visual: 'slider',
    blocksCount: 3,
    targetGap: 16,
    targetPadding: 24,
    items: [],
    correctOrder: [],
    checklist: [],
    accept: 'image/png,image/jpeg,application/pdf',
    maxSizeMB: 8,
    scene: 'premium-card',
    screenTitle: '',
    zones: [],
    svg: undefined,
  };
  if (type === 'choose') {
    const a = rid('opt');
    const b = rid('opt');
    base.options = [
      { id: a, label: '', hint: '' },
      { id: b, label: '', hint: '' },
    ];
    base.correctOptionId = a;
  }
  if (type === 'order') {
    const a = rid('item');
    const b = rid('item');
    base.items = [
      { id: a, label: '' },
      { id: b, label: '' },
    ];
    base.correctOrder = [a, b];
  }
  if (type === 'screen-critique') {
    // Seed from the built-in scene so the teacher has a full, editable draft.
    const seed = premiumCardCritique(base.id);
    base.prompt = seed.prompt;
    base.explanation = seed.explanation;
    base.scene = seed.scene;
    base.screenTitle = seed.screenTitle;
    base.zones = JSON.parse(JSON.stringify(seed.zones)) as CritiqueZone[];
  }
  return base;
}

/** DB payload (already a validated Exercise-shaped object) → flat form draft. */
export function payloadToDraft(payload: Record<string, unknown>): ExerciseDraft {
  const d = emptyDraft((payload.type as ExerciseDraft['type']) ?? 'choose');
  d.id = (payload.id as string) ?? d.id;
  d.prompt = (payload.prompt as string) ?? '';
  d.explanation = (payload.explanation as string) ?? '';
  if (payload.type === 'choose') {
    d.options = ((payload.options as { id: string; label: string; hint?: string }[]) ?? []).map(
      (o) => ({ id: o.id, label: o.label, hint: o.hint ?? '' }),
    );
    d.correctOptionId = (payload.correctOptionId as string) ?? '';
  }
  if (payload.type === 'tune') {
    d.unitLabel = (payload.unitLabel as string) ?? 'px';
    d.min = Number(payload.min ?? 0);
    d.max = Number(payload.max ?? 64);
    d.step = Number(payload.step ?? 4);
    d.correctValue = Number(payload.correctValue ?? 0);
    d.tolerance = Number(payload.tolerance ?? 0);
    d.visual = payload.visual === 'radius' ? 'radius' : 'slider';
  }
  if (payload.type === 'build') {
    d.blocksCount = Number(payload.blocks ?? 3);
    d.step = Number(payload.step ?? 4);
    d.min = Number(payload.min ?? 0);
    d.max = Number(payload.max ?? 48);
    const target = (payload.target ?? {}) as { gap?: number; padding?: number };
    d.targetGap = Number(target.gap ?? 16);
    d.targetPadding = Number(target.padding ?? 24);
  }
  if (payload.type === 'order') {
    d.items = ((payload.items as { id: string; label: string }[]) ?? []).map((i) => ({
      id: i.id,
      label: i.label,
    }));
    d.correctOrder = (payload.correctOrder as string[]) ?? d.items.map((i) => i.id);
  }
  if (payload.type === 'figma-link') {
    d.checklist = (payload.checklist as string[]) ?? [];
  }
  if (payload.type === 'file-upload') {
    d.accept = (payload.accept as string) ?? d.accept;
    d.maxSizeMB = Number(payload.maxSizeMB ?? 8);
    d.checklist = (payload.checklist as string[]) ?? [];
  }
  if (payload.type === 'screen-critique') {
    d.scene = (payload.scene as string) || 'premium-card';
    d.screenTitle = (payload.screenTitle as string) || PREMIUM_CARD_SCREEN_TITLE;
    const zones = payload.zones as CritiqueZone[] | undefined;
    // 'image'/'svg' zones are teacher-authored (may be empty); the built-in DOM
    // scene falls back to its fixed zone set so the grader always has truth.
    const freeform = d.scene === 'image' || d.scene === 'svg';
    d.zones = freeform
      ? (zones ?? [])
      : zones && zones.length
        ? zones
        : (JSON.parse(JSON.stringify(PREMIUM_CARD_ZONES)) as CritiqueZone[]);
    d.image = (payload.image as ExerciseDraft['image']) ?? undefined;
    d.svg = (payload.svg as string) ?? undefined;
  }
  return d;
}

/** Flat form draft → the real Exercise-shaped payload the API expects. */
export function draftToPayload(d: ExerciseDraft): Record<string, unknown> {
  const base = { id: d.id, type: d.type, prompt: d.prompt, explanation: d.explanation };
  switch (d.type) {
    case 'choose':
      return {
        ...base,
        options: d.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint || undefined })),
        correctOptionId: d.correctOptionId,
      };
    case 'tune':
      return {
        ...base,
        unitLabel: d.unitLabel,
        min: d.min,
        max: d.max,
        step: d.step,
        correctValue: d.correctValue,
        tolerance: d.tolerance,
        visual: d.visual,
      };
    case 'build':
      return {
        ...base,
        blocks: d.blocksCount,
        step: d.step,
        min: d.min,
        max: d.max,
        target: { gap: d.targetGap, padding: d.targetPadding },
      };
    case 'order':
      return { ...base, items: d.items, correctOrder: d.correctOrder };
    case 'figma-link':
      return { ...base, checklist: d.checklist.filter(Boolean) };
    case 'file-upload':
      return {
        ...base,
        accept: d.accept,
        maxSizeMB: d.maxSizeMB,
        checklist: d.checklist.filter(Boolean),
      };
    case 'screen-critique':
      return {
        ...base,
        scene: d.scene,
        screenTitle: d.screenTitle,
        zones: d.zones,
        ...(d.scene === 'image' && d.image ? { image: d.image } : {}),
        ...(d.scene === 'svg' && d.svg ? { svg: d.svg } : {}),
      };
  }
}
