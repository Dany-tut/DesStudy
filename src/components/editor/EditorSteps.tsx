'use client';

import { useRef } from 'react';
import { UploadCloud, Trash2, Target, Check, Lock, Globe, FileText, Send, GitCompare, Crop, Wrench } from 'lucide-react';
import { CRITIQUE_ROLES, CRITIQUE_DEFECTS } from '@/lib/curriculum/screenCritique';
import type { CritiqueZone, CritiqueRoleId, CritiqueDefectId } from '@/lib/curriculum/types';
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

/* ─────────────────────────── Step 2 — two variants ─────────────────────────── */

export function Step2Variants({
  draft,
  referenceSvg,
  width,
  height,
  onKind,
  onBroken,
}: {
  draft: EditorDraft;
  referenceSvg: string;
  width: number;
  height: number;
  onKind: (k: ExerciseKind) => void;
  onBroken: (svg: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const needsBroken = draft.kind !== 'critique';

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-y-auto p-8 pb-24">
      <div>
        <p className="text-callout font-semibold text-primary">Тип задания</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {KINDS.map((k) => {
            const active = draft.kind === k.id;
            const Icon = k.icon;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => onKind(k.id)}
                className={[
                  'flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-base',
                  active ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:border-brand/40',
                ].join(' ')}
              >
                <Icon size={18} className={active ? 'text-brand' : 'text-tertiary'} />
                <span className="text-footnote font-semibold text-primary">{k.label}</span>
                <span className="text-caption text-tertiary">{k.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-callout font-semibold text-primary">
          {needsBroken ? 'Эталон и сломанный вариант' : 'Эталонный экран'}
        </p>
        <p className="mt-0.5 text-caption text-tertiary">
          {needsBroken
            ? 'Слева — «ровный» экран (импортированный). Справа загрузи «кривой» — с намеренными дефектами.'
            : 'Для критики достаточно одного экрана — дефекты отметишь на шаге 3.'}
        </p>
        <div className={['mt-3 grid gap-3', needsBroken ? 'sm:grid-cols-2' : ''].join(' ')}>
          <Preview svg={referenceSvg} width={width} height={height} label="Эталон · ровный" tone="ok" />
          {needsBroken &&
            (draft.brokenSvg ? (
              <Preview
                svg={draft.brokenSvg}
                width={width}
                height={height}
                label="Сломанный · кривой"
                tone="broken"
                onClear={() => onBroken(undefined)}
              />
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface text-center transition-base hover:border-brand/40"
              >
                <UploadCloud size={22} className="text-brand" />
                <span className="text-footnote font-medium text-primary">Загрузить сломанный SVG</span>
                <span className="text-caption text-tertiary">экспорт из Figma с дефектами</span>
              </button>
            ))}
        </div>
      </div>

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
    </div>
  );
}

function Preview({
  svg,
  width,
  height,
  label,
  tone,
  onClear,
}: {
  svg: string;
  width: number;
  height: number;
  label: string;
  tone: 'ok' | 'broken';
  onClear?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-canvas">
      <div className="flex items-center justify-between border-b border-border bg-elevated px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-caption font-medium text-secondary">
          <span className={['h-2 w-2 rounded-full', tone === 'ok' ? 'bg-[#3FB950]' : 'bg-warning'].join(' ')} />
          {label}
        </span>
        {onClear && (
          <button type="button" onClick={onClear} className="text-tertiary hover:text-danger" title="Убрать">
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className="canvas-grid flex items-center justify-center p-4">
        <div
          className="max-h-[300px] w-auto shadow-md [&>svg]:h-auto [&>svg]:max-h-[280px] [&>svg]:w-auto"
          style={{ aspectRatio: `${width} / ${height}` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── Step 3 — zone editor ─────────────────────────── */

export function ZoneEditor({
  layer,
  zone,
  onAdd,
  onRemove,
  onPatch,
}: {
  layer: Layer;
  zone?: CritiqueZone;
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
