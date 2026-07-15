'use client';

import { Plus, X, Check } from 'lucide-react';
import type { CritiqueZone, CritiqueRoleId, CritiqueDefectId, CritiqueFixOption } from '@/lib/curriculum/types';
import { CRITIQUE_ROLES, CRITIQUE_DEFECTS, CRITIQUE_SCENES } from '@/lib/curriculum/screenCritique';

/**
 * Admin editor for a screen-critique exercise. Phase 1: the screen is a built-in
 * DOM scene, so the zone list + ids are fixed by that scene — the teacher edits
 * each zone's role, defect, notes and reconstruction fixes (and marks the one
 * correct fix). Uploaded before/after screens come in a later phase.
 */

const inputClass =
  'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary';
const labelClass = 'mb-1 block text-caption text-secondary';

export function ScreenCritiqueFields({
  scene,
  screenTitle,
  zones,
  onScene,
  onScreenTitle,
  onZones,
}: {
  scene: string;
  screenTitle: string;
  zones: CritiqueZone[];
  onScene: (v: string) => void;
  onScreenTitle: (v: string) => void;
  onZones: (v: CritiqueZone[]) => void;
}) {
  const patchZone = (i: number, patch: Partial<CritiqueZone>) =>
    onZones(zones.map((z, j) => (j === i ? { ...z, ...patch } : z)));

  const patchFix = (zi: number, fi: number, patch: Partial<CritiqueFixOption>) => {
    const z = zones[zi];
    const fixes = (z.fixes ?? []).map((f, j) => (j === fi ? { ...f, ...patch } : f));
    patchZone(zi, { fixes });
  };

  const setCorrectFix = (zi: number, fi: number) => {
    const z = zones[zi];
    const fixes = (z.fixes ?? []).map((f, j) => ({ ...f, correct: j === fi }));
    patchZone(zi, { fixes });
  };

  const addFix = (zi: number) => {
    const z = zones[zi];
    const fixes = [...(z.fixes ?? []), { id: `fix-${Math.random().toString(36).slice(2, 7)}`, label: '' }];
    patchZone(zi, { fixes });
  };

  const removeFix = (zi: number, fi: number) => {
    const z = zones[zi];
    let fixes = (z.fixes ?? []).filter((_, j) => j !== fi);
    // Keep exactly one correct if any remain and none is marked.
    if (fixes.length > 0 && !fixes.some((f) => f.correct)) fixes = fixes.map((f, j) => ({ ...f, correct: j === 0 }));
    patchZone(zi, { fixes: fixes.length ? fixes : undefined });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Сцена (экран)</label>
          <select className={inputClass} value={scene} onChange={(e) => onScene(e.target.value)}>
            {CRITIQUE_SCENES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="mt-1 text-caption text-tertiary">
            Пока доступна встроенная сцена. Загрузка своих экранов (PDF/картинка) — в следующем этапе.
          </p>
        </div>
        <div>
          <label className={labelClass}>Описание экрана (контекст для ИИ)</label>
          <input className={inputClass} value={screenTitle} onChange={(e) => onScreenTitle(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-caption text-secondary">
          Зоны экрана ({zones.length}) — id зон заданы сценой; редактируй роль, дефект и исправления.
        </p>
        {zones.map((z, i) => (
          <div key={z.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-caption text-tertiary">{z.id}</span>
              <input
                className={inputClass}
                value={z.label}
                placeholder="Название зоны"
                onChange={(e) => patchZone(i, { label: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Роль на экране</label>
                <select
                  className={inputClass}
                  value={z.role}
                  onChange={(e) => patchZone(i, { role: e.target.value as CritiqueRoleId })}
                >
                  {CRITIQUE_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Дефект зоны</label>
                <select
                  className={inputClass}
                  value={z.defect}
                  onChange={(e) => patchZone(i, { defect: e.target.value as CritiqueDefectId })}
                >
                  {CRITIQUE_DEFECTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className={labelClass}>Почему такая роль (разбор для ученика)</label>
              <textarea
                className={inputClass}
                rows={2}
                value={z.roleNote}
                onChange={(e) => patchZone(i, { roleNote: e.target.value })}
              />
            </div>
            <div className="mt-3">
              <label className={labelClass}>Замысел зоны (ground truth — ИИ судит правки по нему)</label>
              <textarea
                className={inputClass}
                rows={2}
                value={z.intent}
                onChange={(e) => patchZone(i, { intent: e.target.value })}
              />
            </div>
            <div className="mt-3">
              <label className={labelClass}>Почему такой дефект (разбор)</label>
              <input
                className={inputClass}
                value={z.defectNote}
                onChange={(e) => patchZone(i, { defectNote: e.target.value })}
              />
            </div>

            {/* Fixes (reconstruction) */}
            <div className="mt-3">
              <label className={labelClass}>
                Варианты исправления — отметь верное (оно чинит зону у ученика)
              </label>
              <div className="space-y-2">
                {(z.fixes ?? []).map((f, fi) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectFix(i, fi)}
                      title="Верное исправление"
                      className={[
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-fast',
                        f.correct ? 'border-[#3FB950] bg-[#3FB950] text-white' : 'border-border text-transparent hover:border-[#3FB950]',
                      ].join(' ')}
                    >
                      <Check size={13} strokeWidth={3} />
                    </button>
                    <input
                      className={inputClass}
                      value={f.label}
                      placeholder="Текст варианта"
                      onChange={(e) => patchFix(i, fi, { label: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeFix(i, fi)}
                      className="shrink-0 text-tertiary hover:text-danger"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addFix(i)}
                  className="flex items-center gap-1 text-footnote text-brand hover:underline"
                >
                  <Plus size={14} /> Добавить вариант
                </button>
                {z.defect !== 'none' && (z.fixes?.length ?? 0) === 0 && (
                  <p className="text-caption text-warning">
                    У зоны есть дефект — добавь варианты исправления, иначе пересборки не будет.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
