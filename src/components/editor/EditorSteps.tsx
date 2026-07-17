'use client';

import { useRef } from 'react';
import { UploadCloud, Trash2, Target, Check, Lock, Globe, FileText, Send, GitCompare, Crop, Wrench, Plus, GitCompareArrows, Sparkles } from 'lucide-react';
import { CRITIQUE_ROLES, CRITIQUE_DEFECTS, DEFECT_PROPS } from '@/lib/curriculum/screenCritique';
import type {
  CritiqueZone,
  CritiqueRoleId,
  CritiqueDefectId,
  CritiqueFixOption,
  DefectDelta,
  DefectProp,
} from '@/lib/curriculum/types';
import type { Layer } from '@/lib/editor/types';
import { useT } from '@/lib/i18n/client';

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

const KINDS: { id: ExerciseKind; labelKey: string; hintKey: string; icon: typeof GitCompare }[] = [
  { id: 'critique', labelKey: 'editor.steps.kindCritique', hintKey: 'editor.steps.kindCritiqueHint', icon: Target },
  { id: 'spot-diff', labelKey: 'editor.steps.kindSpotDiff', hintKey: 'editor.steps.kindSpotDiffHint', icon: Crop },
  { id: 'fix-screen', labelKey: 'editor.steps.kindFixScreen', hintKey: 'editor.steps.kindFixScreenHint', icon: Wrench },
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
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const needsBroken = draft.kind !== 'critique';
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption font-medium uppercase tracking-wide text-tertiary">{t('editor.steps.taskType')}</p>
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
                <span className="truncate text-caption font-semibold text-primary" title={t(k.labelKey)}>
                  {t(k.labelKey)}
                </span>
                <span className="text-caption leading-tight text-tertiary">{t(k.hintKey)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {needsBroken && (
        <>
          <p className="mt-1 text-caption font-medium uppercase tracking-wide text-tertiary">{t('editor.steps.brokenVariant')}</p>
          {draft.brokenSvg ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-2">
              <span className="flex items-center gap-1.5 text-caption text-secondary">
                <span className="h-2 w-2 rounded-full bg-warning" /> {t('editor.steps.loaded')}
              </span>
              <button
                type="button"
                onClick={() => onBroken(undefined)}
                className="text-tertiary transition-fast hover:text-danger"
                title={t('editor.steps.remove')}
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
              <span className="text-caption font-medium text-primary">{t('editor.steps.uploadBrokenSvg')}</span>
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
  onAskAI,
  aiBusy,
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
  /** Ask the vision model to fill this zone's prose fields. Omitted when the
   *  zone's frame has no эталон twin to compare against. */
  onAskAI?: () => void;
  aiBusy?: boolean;
}) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium uppercase tracking-wide text-tertiary">{t('editor.zone.title')}</p>
          <p className="mt-0.5 truncate text-footnote font-semibold text-primary">{layer.name}</p>
        </div>
        {zone && onAskAI && (
          <button
            type="button"
            onClick={onAskAI}
            disabled={aiBusy}
            title={t('editor.zone.askAIHint')}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-caption font-medium text-brand transition-fast hover:bg-brand/15 disabled:opacity-50"
          >
            <Sparkles size={12} className={aiBusy ? 'animate-pulse' : ''} />
            {aiBusy ? t('editor.zone.askAIBusy') : t('editor.zone.askAI')}
          </button>
        )}
      </div>

      {!zone ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand/10 py-2 text-footnote font-medium text-brand transition-fast hover:bg-brand/15"
        >
          <Target size={14} /> {t('editor.zone.make')}
        </button>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-tertiary">{t('editor.zone.label')}</span>
            <input
              defaultValue={zone.label}
              key={`lbl-${zone.id}`}
              onChange={(e) => onPatch({ label: e.target.value })}
              className="rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-tertiary">{t('editor.zone.correctRole')}</span>
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

          {/* Debatable picks grade as yellow «спорно» rather than wrong — design
              is subjective, and the strongest reading is rarely the only one. */}
          <ChipPicker
            title={t('editor.zone.debatableRoles')}
            options={CRITIQUE_ROLES.filter((r) => r.id !== zone.role)}
            selected={zone.debatableRoles ?? []}
            onChange={(ids) => onPatch({ debatableRoles: ids.length ? (ids as CritiqueRoleId[]) : undefined })}
          />

          <label className="flex flex-col gap-1">
            <span className="text-caption text-tertiary">{t('editor.zone.mentorNote')}</span>
            <textarea
              rows={3}
              defaultValue={zone.roleNote}
              key={`note-${zone.id}`}
              onChange={(e) => onPatch({ roleNote: e.target.value })}
              placeholder={t('editor.zone.mentorNotePlaceholder')}
              className="resize-none rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-tertiary">{t('editor.zone.intent')}</span>
            <textarea
              rows={2}
              defaultValue={zone.intent}
              key={`intent-${zone.id}`}
              onChange={(e) => onPatch({ intent: e.target.value })}
              placeholder={t('editor.zone.intentPlaceholder')}
              className="resize-none rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 border-t border-border pt-3">
            <span className="text-caption text-tertiary">{t('editor.zone.defect')}</span>
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

          <ChipPicker
            title={t('editor.zone.debatableDefects')}
            options={CRITIQUE_DEFECTS.filter((d) => d.id !== zone.defect && d.id !== 'none')}
            selected={zone.debatableDefects ?? []}
            onChange={(ids) => onPatch({ debatableDefects: ids.length ? (ids as CritiqueDefectId[]) : undefined })}
          />

          <label className="flex flex-col gap-1">
            <span className="text-caption text-tertiary">{t('editor.zone.defectNote')}</span>
            <textarea
              rows={2}
              defaultValue={zone.defectNote}
              key={`dnote-${zone.id}`}
              onChange={(e) => onPatch({ defectNote: e.target.value })}
              placeholder={t('editor.zone.defectNotePlaceholder')}
              className="resize-none rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            />
          </label>

          {/* A clean zone has nothing to repair, so the fix options don't apply. */}
          {zone.defect !== 'none' && (
            <FixEditor fixes={zone.fixes ?? []} onChange={(fixes) => onPatch({ fixes: fixes.length ? fixes : undefined })} />
          )}

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
            <Trash2 size={13} /> {t('editor.zone.removeZone')}
          </button>
        </>
      )}
    </div>
  );
}

/* ───────────── Multi-select chips (спорные роли / дефекты) ───────────── */

/** Toggleable chips over a role/defect catalog. `hint` rides along as a title so
 *  the teacher gets the same coaching text the learner's palette shows. */
function ChipPicker({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: { id: string; label: string; hint: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption text-tertiary">{title}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              title={o.hint}
              onClick={() => onChange(on ? selected.filter((i) => i !== o.id) : [...selected, o.id])}
              className={[
                'rounded-md border px-1.5 py-0.5 text-caption transition-fast',
                on
                  ? 'border-warning/50 bg-warning/10 text-warning'
                  : 'border-border text-tertiary hover:border-warning/40 hover:text-secondary',
              ].join(' ')}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Candidate fixes (ровно один правильный) ───────────── */

/**
 * The reconstruction step's answer options. Exactly one fix is `correct` —
 * picking a new one clears the previous, so the list can never grade two ways.
 */
function FixEditor({
  fixes,
  onChange,
}: {
  fixes: CritiqueFixOption[];
  onChange: (fixes: CritiqueFixOption[]) => void;
}) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <span className="text-caption font-medium uppercase tracking-wide text-tertiary">{t('editor.zone.fixes')}</span>
      {fixes.length === 0 && <p className="text-caption leading-tight text-tertiary">{t('editor.zone.fixesEmpty')}</p>}

      {fixes.map((f, i) => (
        <div key={f.id} className="flex items-center gap-1.5">
          <button
            type="button"
            title={t('editor.zone.markCorrect')}
            onClick={() => onChange(fixes.map((x, j) => ({ ...x, correct: j === i })))}
            className={[
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-fast',
              f.correct ? 'border-success bg-success/15 text-success' : 'border-border text-tertiary hover:border-success/50',
            ].join(' ')}
          >
            <Check size={11} />
          </button>
          <input
            value={f.label}
            onChange={(e) => onChange(fixes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            placeholder={t('editor.zone.fixPlaceholder')}
            className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-2 py-1 text-caption text-primary"
          />
          <button
            type="button"
            onClick={() => onChange(fixes.filter((_, j) => j !== i))}
            className="shrink-0 rounded p-1 text-tertiary transition-fast hover:text-danger"
            title={t('editor.zone.removeFix')}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...fixes, { id: `fix_${Math.random().toString(36).slice(2, 9)}`, label: '' }])}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-caption font-medium text-secondary transition-fast hover:border-brand/40 hover:text-primary"
      >
        <Plus size={13} /> {t('editor.zone.addFix')}
      </button>
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
  const { t } = useT();
  const patchAt = (i: number, patch: Partial<DefectDelta>) =>
    onChange(deltas.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const removeAt = (i: number) => onChange(deltas.filter((_, j) => j !== i));
  const add = () => onChange([...deltas, { prop: 'fontSize', was: '', now: '' }]);

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium uppercase tracking-wide text-tertiary">{t('editor.zone.whatBroke')}</span>
        {autoDeltas && autoDeltas.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(autoDeltas)}
            title={t('editor.zone.compareTitle')}
            className="flex items-center gap-1 text-caption font-medium text-brand transition-fast hover:text-brand-hover"
          >
            <GitCompareArrows size={12} /> {t('editor.zone.fromReference')}
          </button>
        )}
      </div>

      {autoDeltas && autoDeltas.length === 0 && deltas.length === 0 && (
        <p className="text-caption leading-tight text-tertiary">{t('editor.zone.matchesReference')}</p>
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
              title={t('editor.zone.removeDiff')}
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={d.was ?? ''}
              onChange={(e) => patchAt(i, { was: e.target.value })}
              placeholder={t('editor.zone.referencePlaceholder')}
              className="min-w-0 flex-1 rounded-md border border-success/40 bg-canvas px-2 py-1 text-caption text-primary"
            />
            <span className="shrink-0 text-caption text-tertiary">→</span>
            <input
              value={d.now ?? ''}
              onChange={(e) => patchAt(i, { now: e.target.value })}
              placeholder={t('editor.zone.brokenPlaceholder')}
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
        <Plus size={13} /> {t('editor.zone.addDiff')}
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
  const { t } = useT();
  const restricted = draft.access === 'RESTRICTED';
  const kindLabelKey = KINDS.find((k) => k.id === draft.kind)?.labelKey;
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-6 overflow-y-auto p-8 pb-24">
      <label className="flex flex-col gap-1">
        <span className="text-caption text-tertiary">{t('editor.access.lessonTitle')}</span>
        <input
          defaultValue={draft.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder={t('editor.access.lessonTitlePlaceholder')}
          className="rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary"
        />
      </label>

      <div>
        <p className="text-callout font-semibold text-primary">{t('editor.access.access')}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <AccessCard
            active={!restricted}
            icon={Globe}
            title={t('editor.access.public')}
            hint={t('editor.access.publicHint')}
            onClick={() => onPatch({ access: 'PUBLIC' })}
          />
          <AccessCard
            active={restricted}
            icon={Lock}
            title={t('editor.access.restricted')}
            hint={t('editor.access.restrictedHint')}
            onClick={() => onPatch({ access: 'RESTRICTED' })}
          />
        </div>
        {restricted && (
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-caption text-tertiary">{t('editor.access.audienceLabel')}</span>
            <input
              defaultValue={draft.audience}
              onChange={(e) => onPatch({ audience: e.target.value })}
              placeholder={t('editor.access.audiencePlaceholder')}
              className="rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary"
            />
          </label>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-caption font-medium uppercase tracking-wide text-tertiary">{t('editor.access.summary')}</p>
        <ul className="space-y-1 text-caption text-secondary">
          <li>{t('editor.access.summaryType')}: <b className="text-primary">{kindLabelKey ? t(kindLabelKey) : ''}</b></li>
          <li>{t('editor.access.summaryZones')}: <b className="text-primary">{zoneCount}</b></li>
          <li>{t('editor.access.summaryDiffs')}: <b className="text-primary">{draft.zones.reduce((n, z) => n + (z.deltas?.length ?? 0), 0)}</b></li>
          <li>{t('editor.access.summaryBroken')}: <b className="text-primary">{draft.brokenSvg ? t('editor.access.yes') : t('editor.access.no')}</b></li>
          <li>{t('editor.access.summaryAccess')}: <b className="text-primary">{restricted ? t('editor.access.restrictedShort') : t('editor.access.publicShort')}</b></li>
        </ul>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-footnote font-medium text-secondary transition-fast hover:text-primary"
        >
          <FileText size={15} /> {t('editor.access.toDrafts')}
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2.5 text-footnote font-semibold text-on-brand transition-fast hover:bg-brand-hover"
        >
          <Send size={15} /> {t('editor.access.publish')}
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
