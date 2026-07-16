'use client';

import { useRef } from 'react';
import { UploadCloud, Trash2, Target, Check, Lock, Globe, FileText, Send, GitCompare, Crop, Wrench, Plus, GitCompareArrows } from 'lucide-react';
import { CRITIQUE_ROLES, CRITIQUE_DEFECTS, DEFECT_PROPS } from '@/lib/curriculum/screenCritique';
import type { CritiqueZone, CritiqueRoleId, CritiqueDefectId, DefectDelta, DefectProp } from '@/lib/curriculum/types';
import type { Layer } from '@/lib/editor/types';

export type ExerciseKind = 'critique' | 'spot-diff' | 'fix-screen';
export type AccessMode = 'PUBLIC' | 'RESTRICTED';

export interface EditorDraft {
  title: string;
  kind: ExerciseKind;
  /** The intentionally-broken variant («кривой»); reference is the main svg. */
  brokenSvg?: string;
  zones: CritiqueZone[];
  access: AccessMode;
  /** Free-text audience note for now (groups/learners wiring is milestone 4). */
  audience: string;
}

const KINDS: { id: ExerciseKind; label: string; hint: string; icon: typeof GitCompare }[] = [
  { id: 'critique', label: 'Критика экрана', hint: 'ученик разбирает роли и дефекты одного экрана', icon: Target },
  { id: 'spot-diff', label: 'Найди отличие', hint: 'сравнить эталон и сломанный вариант', icon: Crop },
  { id: 'fix-screen', label: 'Почини экран', hint: 'из сломанного собрать правильный', icon: Wrench },
];

/* ───────────────── Unified editor — exercise-type + broken variant ───────────────── */

/**
 * Compact setup shown at the top of the merged editor's right panel (when no
 * layer is selected): pick the exercise type, and — for spot-diff / fix-screen
 * — attach the intentionally-broken variant. Эталон/косячный roles are now set
 * per-frame on the canvas, so this only carries the exercise kind and the
 * optional legacy broken-SVG upload.
 */
export function ExerciseSetupPanel({
  draft,
  onKind,
  onBroken,
}: {
  draft: EditorDraft;
  onKind: (k: ExerciseKind) => void;
  onBroken: (svg: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const needsBroken = draft.kind !== 'critique';
  return (
    <div className="flex flex-col gap-3 px-1">
      <p className="text-caption font-medium uppercase tracking-wide text-tertiary">Тип задания</p>
      <div className="flex flex-col gap-1.5">
        {KINDS.map((k) => {
          const active = draft.kind === k.id;
          const Icon = k.icon;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => onKind(k.id)}
              className={[
                'flex items-start gap-2 rounded-lg border p-2 text-left transition-base',
                active ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:border-brand/40',
              ].join(' ')}
            >
              <Icon size={15} className={active ? 'mt-0.5 text-brand' : 'mt-0.5 text-tertiary'} />
              <span className="flex min-w-0 flex-col">
                <span className="text-caption font-semibold text-primary">{k.label}</span>
                <span className="text-caption leading-tight text-tertiary">{k.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {needsBroken && (
        <>
          <p className="mt-1 text-caption font-medium uppercase tracking-wide text-tertiary">Сломанный вариант</p>
          {draft.brokenSvg ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-2">
              <span className="flex items-center gap-1.5 text-caption text-secondary">
                <span className="h-2 w-2 rounded-full bg-warning" /> Загружен
              </span>
              <button
                type="button"
                onClick={() => onBroken(undefined)}
                className="text-tertiary transition-fast hover:text-danger"
                title="Убрать"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-surface py-4 text-center transition-base hover:border-brand/40"
            >
              <UploadCloud size={18} className="text-brand" />
              <span className="text-caption font-medium text-primary">Загрузить «кривой» SVG</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) onBroken(await f.text());
              e.target.value = '';
            }}
          />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Unified editor — zone editor ─────────────────────────── */

export function ZoneEditor({
  layer,
  zone,
  autoDeltas,
  onAdd,
  onRemove,
  onPatch,
}: {
  layer: Layer;
  zone?: CritiqueZone;
  /**
   * Property diffs auto-detected against the эталон twin (undefined when the
   * layer isn't inside a flawed frame or there's no matching reference layer).
   * An empty array means «paired, but nothing differs».
   */
  autoDeltas?: DefectDelta[];
  onAdd: () => void;
  onRemove: () => void;
  onPatch: (patch: Partial<CritiqueZone>) => void;
}) {
  return (
    <div className="flex flex-col gap-4 px-1">
      <div>
        <p className="text-caption font-medium uppercase tracking-wide text-tertiary">Зона критики</p>
        <p className="mt-0.5 truncate text-footnote font-semibold text-primary">{layer.name}</p>
      </div>

      {!zone ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand/10 py-2 text-footnote font-medium text-brand transition-fast hover:bg-brand/15"
        >
          <Target size={14} /> Сделать зоной критики
        </button>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-tertiary">Подпись зоны</span>
            <input
              defaultValue={zone.label}
              key={`lbl-${zone.id}`}
              onChange={(e) => onPatch({ label: e.target.value })}
              className="rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-tertiary">Правильная роль</span>
            <select
              value={zone.role}
              onChange={(e) => onPatch({ role: e.target.value as CritiqueRoleId })}
              className="rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            >
              {CRITIQUE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-tertiary">Дефект</span>
            <select
              value={zone.defect}
              onChange={(e) => onPatch({ defect: e.target.value as CritiqueDefectId })}
              className="rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            >
              {CRITIQUE_DEFECTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-tertiary">Заметка ментора</span>
            <textarea
              rows={3}
              defaultValue={zone.roleNote}
              key={`note-${zone.id}`}
              onChange={(e) => onPatch({ roleNote: e.target.value })}
              placeholder="Почему роль/дефект именно такие"
              className="resize-none rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            />
          </label>

          <DeltaEditor
            deltas={zone.deltas ?? []}
            autoDeltas={autoDeltas}
            onChange={(deltas) => onPatch({ deltas })}
          />

          <button
            type="button"
            onClick={onRemove}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-caption font-medium text-danger transition-fast hover:bg-danger/5"
          >
            <Trash2 size={13} /> Убрать зону
          </button>
        </>
      )}
    </div>
  );
}

/* ───────────── Per-property defect deltas (эталон → сломанный) ───────────── */

/**
 * Records the concrete property changes vs. the эталон twin. Each row is a
 * property + было/стало pair. «Заполнить из эталона» pre-fills rows from the
 * auto-diff (when the layer is paired with a reference layer).
 */
function DeltaEditor({
  deltas,
  autoDeltas,
  onChange,
}: {
  deltas: DefectDelta[];
  autoDeltas?: DefectDelta[];
  onChange: (deltas: DefectDelta[]) => void;
}) {
  const patchAt = (i: number, patch: Partial<DefectDelta>) =>
    onChange(deltas.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const removeAt = (i: number) => onChange(deltas.filter((_, j) => j !== i));
  const add = () => onChange([...deltas, { prop: 'fontSize', was: '', now: '' }]);

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium uppercase tracking-wide text-tertiary">Что сломано</span>
        {autoDeltas && autoDeltas.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(autoDeltas)}
            title="Сравнить с эталоном и подставить отличия"
            className="flex items-center gap-1 text-caption font-medium text-brand transition-fast hover:text-brand-hover"
          >
            <GitCompareArrows size={12} /> Из эталона
          </button>
        )}
      </div>

      {autoDeltas && autoDeltas.length === 0 && deltas.length === 0 && (
        <p className="text-caption leading-tight text-tertiary">Слой совпадает с эталоном — отличий нет.</p>
      )}

      {deltas.map((d, i) => (
        <div key={i} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2">
          <div className="flex items-center gap-1.5">
            <select
              value={d.prop}
              onChange={(e) => patchAt(i, { prop: e.target.value as DefectProp })}
              className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-2 py-1 text-caption text-primary"
            >
              {DEFECT_PROPS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="shrink-0 rounded p-1 text-tertiary transition-fast hover:text-danger"
              title="Убрать отличие"
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={d.was ?? ''}
              onChange={(e) => patchAt(i, { was: e.target.value })}
              placeholder="эталон"
              className="min-w-0 flex-1 rounded-md border border-success/40 bg-canvas px-2 py-1 text-caption text-primary"
            />
            <span className="shrink-0 text-caption text-tertiary">→</span>
            <input
              value={d.now ?? ''}
              onChange={(e) => patchAt(i, { now: e.target.value })}
              placeholder="сломано"
              className="min-w-0 flex-1 rounded-md border border-warning/50 bg-canvas px-2 py-1 text-caption text-primary"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-caption font-medium text-secondary transition-fast hover:border-brand/40 hover:text-primary"
      >
        <Plus size={13} /> Добавить отличие
      </button>
    </div>
  );
}

/* ─────────────────────────── Step 4 — access + publish ─────────────────────────── */

export function Step4Access({
  draft,
  zoneCount,
  onPatch,
  onSave,
  onPublish,
}: {
  draft: EditorDraft;
  zoneCount: number;
  onPatch: (patch: Partial<EditorDraft>) => void;
  onSave: () => void;
  onPublish: () => void;
}) {
  const restricted = draft.access === 'RESTRICTED';
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-6 overflow-y-auto p-8 pb-24">
      <label className="flex flex-col gap-1">
        <span className="text-caption text-tertiary">Название урока</span>
        <input
          defaultValue={draft.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Напр. «Премиум-карта: иерархия»"
          className="rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary"
        />
      </label>

      <div>
        <p className="text-callout font-semibold text-primary">Доступ</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <AccessCard
            active={!restricted}
            icon={Globe}
            title="Публично"
            hint="виден всем, включая гостей"
            onClick={() => onPatch({ access: 'PUBLIC' })}
          />
          <AccessCard
            active={restricted}
            icon={Lock}
            title="Ограниченный"
            hint="только выбранным группам/ученикам"
            onClick={() => onPatch({ access: 'RESTRICTED' })}
          />
        </div>
        {restricted && (
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-caption text-tertiary">Кому открыть (группы / ученики)</span>
            <input
              defaultValue={draft.audience}
              onChange={(e) => onPatch({ audience: e.target.value })}
              placeholder="Напр. «Поток UX-1, Иван П.»"
              className="rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary"
            />
          </label>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-caption font-medium uppercase tracking-wide text-tertiary">Итог</p>
        <ul className="space-y-1 text-caption text-secondary">
          <li>Тип: <b className="text-primary">{KINDS.find((k) => k.id === draft.kind)?.label}</b></li>
          <li>Зон критики: <b className="text-primary">{zoneCount}</b></li>
          <li>Отмечено отличий: <b className="text-primary">{draft.zones.reduce((n, z) => n + (z.deltas?.length ?? 0), 0)}</b></li>
          <li>Сломанный вариант: <b className="text-primary">{draft.brokenSvg ? 'есть' : 'нет'}</b></li>
          <li>Доступ: <b className="text-primary">{restricted ? 'ограниченный' : 'публичный'}</b></li>
        </ul>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-footnote font-medium text-secondary transition-fast hover:text-primary"
        >
          <FileText size={15} /> В черновики
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2.5 text-footnote font-semibold text-on-brand transition-fast hover:bg-brand-hover"
        >
          <Send size={15} /> Опубликовать
        </button>
      </div>
    </div>
  );
}

function AccessCard({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: typeof Globe;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-base',
        active ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:border-brand/40',
      ].join(' ')}
    >
      <Icon size={18} className={active ? 'text-brand' : 'text-tertiary'} />
      <span className="flex flex-col">
        <span className="flex items-center gap-1 text-footnote font-semibold text-primary">
          {title}
          {active && <Check size={13} className="text-brand" />}
        </span>
        <span className="text-caption text-tertiary">{hint}</span>
      </span>
    </button>
  );
}
