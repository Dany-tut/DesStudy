'use client';

import { Plus, X } from 'lucide-react';
import type { CritiqueZone, CritiqueImage } from '@/lib/curriculum/types';
import { ScreenCritiqueFields } from './ScreenCritiqueFields';

/**
 * Flat draft shape covering every Exercise type's fields at once — simplest
 * way to back one form with a type switch, without 6 separate state shapes.
 * Converted to the real discriminated-union payload only on save (see
 * `draftToPayload` in LessonBuilder.tsx).
 */
export interface ExerciseDraft {
  type: 'choose' | 'tune' | 'build' | 'order' | 'figma-link' | 'file-upload' | 'screen-critique';
  id: string;
  prompt: string;
  explanation: string;
  options: { id: string; label: string; hint: string }[];
  correctOptionId: string;
  unitLabel: string;
  min: number;
  max: number;
  step: number;
  correctValue: number;
  tolerance: number;
  visual: 'slider' | 'radius';
  blocksCount: number;
  targetGap: number;
  targetPadding: number;
  items: { id: string; label: string }[];
  correctOrder: string[];
  checklist: string[];
  accept: string;
  maxSizeMB: number;
  // screen-critique
  scene: string;
  screenTitle: string;
  zones: CritiqueZone[];
  image?: CritiqueImage;
}

const inputClass =
  'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary';
const labelClass = 'mb-1 block text-caption text-secondary';

export function ExerciseFieldsEditor({
  draft,
  onChange,
}: {
  draft: ExerciseDraft;
  onChange: (next: ExerciseDraft) => void;
}) {
  const set = <K extends keyof ExerciseDraft>(key: K, value: ExerciseDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Формулировка (prompt)</label>
        <textarea
          className={inputClass}
          rows={2}
          value={draft.prompt}
          onChange={(e) => set('prompt', e.target.value)}
        />
      </div>

      {draft.type === 'choose' && (
        <div>
          <label className={labelClass}>Варианты ответа</label>
          <div className="space-y-2">
            {draft.options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={draft.correctOptionId === opt.id}
                  onChange={() => set('correctOptionId', opt.id)}
                  title="Верный вариант"
                />
                <input
                  className={inputClass}
                  value={opt.label}
                  placeholder="Текст варианта"
                  onChange={(e) => {
                    const options = [...draft.options];
                    options[i] = { ...opt, label: e.target.value };
                    set('options', options);
                  }}
                />
                <input
                  className={inputClass}
                  value={opt.hint}
                  placeholder="Подсказка при ошибке (опц.)"
                  onChange={(e) => {
                    const options = [...draft.options];
                    options[i] = { ...opt, hint: e.target.value };
                    set('options', options);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const options = draft.options.filter((o) => o.id !== opt.id);
                    set('options', options);
                    if (draft.correctOptionId === opt.id) set('correctOptionId', options[0]?.id ?? '');
                  }}
                  className="shrink-0 text-tertiary hover:text-danger"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                set('options', [
                  ...draft.options,
                  { id: `opt-${Math.random().toString(36).slice(2, 7)}`, label: '', hint: '' },
                ])
              }
              className="flex items-center gap-1 text-footnote text-brand hover:underline"
            >
              <Plus size={14} /> Добавить вариант
            </button>
          </div>
        </div>
      )}

      {draft.type === 'tune' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Мин" value={draft.min} onChange={(v) => set('min', v)} />
          <NumField label="Макс" value={draft.max} onChange={(v) => set('max', v)} />
          <NumField label="Шаг" value={draft.step} onChange={(v) => set('step', v)} />
          <NumField
            label="Верное значение"
            value={draft.correctValue}
            onChange={(v) => set('correctValue', v)}
          />
          <NumField
            label="Допуск (±)"
            value={draft.tolerance}
            onChange={(v) => set('tolerance', v)}
          />
          <div>
            <label className={labelClass}>Единица</label>
            <input
              className={inputClass}
              value={draft.unitLabel}
              onChange={(e) => set('unitLabel', e.target.value)}
            />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className={labelClass}>Визуал</label>
            <select
              className={inputClass}
              value={draft.visual}
              onChange={(e) => set('visual', e.target.value as ExerciseDraft['visual'])}
            >
              <option value="slider">Ползунок</option>
              <option value="radius">Drag-радиус (только для px-радиусов)</option>
            </select>
          </div>
        </div>
      )}

      {draft.type === 'build' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Блоков в карточке" value={draft.blocksCount} onChange={(v) => set('blocksCount', v)} />
          <NumField label="Шаг сетки" value={draft.step} onChange={(v) => set('step', v)} />
          <NumField label="Мин" value={draft.min} onChange={(v) => set('min', v)} />
          <NumField label="Макс" value={draft.max} onChange={(v) => set('max', v)} />
          <NumField label="Цель: gap" value={draft.targetGap} onChange={(v) => set('targetGap', v)} />
          <NumField
            label="Цель: padding"
            value={draft.targetPadding}
            onChange={(v) => set('targetPadding', v)}
          />
        </div>
      )}

      {draft.type === 'order' && (
        <div>
          <label className={labelClass}>Элементы — в правильном итоговом порядке сверху вниз</label>
          <div className="space-y-2">
            {draft.items.map((it, i) => (
              <div key={it.id} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-caption text-tertiary">{i + 1}</span>
                <input
                  className={inputClass}
                  value={it.label}
                  onChange={(e) => {
                    const items = [...draft.items];
                    items[i] = { ...it, label: e.target.value };
                    set('items', items);
                    set('correctOrder', items.map((x) => x.id));
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const items = draft.items.filter((x) => x.id !== it.id);
                    set('items', items);
                    set('correctOrder', items.map((x) => x.id));
                  }}
                  className="shrink-0 text-tertiary hover:text-danger"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const id = `item-${Math.random().toString(36).slice(2, 7)}`;
                const items = [...draft.items, { id, label: '' }];
                set('items', items);
                set('correctOrder', items.map((x) => x.id));
              }}
              className="flex items-center gap-1 text-footnote text-brand hover:underline"
            >
              <Plus size={14} /> Добавить элемент
            </button>
          </div>
          <p className="mt-1 text-caption text-tertiary">
            Ученик увидит их перемешанными — правильный порядок это тот, что задан здесь.
          </p>
        </div>
      )}

      {draft.type === 'screen-critique' && (
        <ScreenCritiqueFields
          scene={draft.scene}
          screenTitle={draft.screenTitle}
          zones={draft.zones}
          onScene={(v) => set('scene', v)}
          onScreenTitle={(v) => set('screenTitle', v)}
          onZones={(v) => set('zones', v)}
        />
      )}

      {draft.type === 'figma-link' && (
        <ChecklistField
          checklist={draft.checklist}
          onChange={(v) => set('checklist', v)}
        />
      )}

      {draft.type === 'file-upload' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Accept (MIME)</label>
              <input
                className={inputClass}
                value={draft.accept}
                onChange={(e) => set('accept', e.target.value)}
              />
            </div>
            <NumField label="Макс. МБ" value={draft.maxSizeMB} onChange={(v) => set('maxSizeMB', v)} />
          </div>
          <ChecklistField checklist={draft.checklist} onChange={(v) => set('checklist', v)} />
        </>
      )}

      <div>
        <label className={labelClass}>Объяснение (показывается после ответа)</label>
        <textarea
          className={inputClass}
          rows={2}
          value={draft.explanation}
          onChange={(e) => set('explanation', e.target.value)}
        />
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ChecklistField({
  checklist,
  onChange,
}: {
  checklist: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <label className={labelClass}>Чек-лист для проверки (по одному пункту в строке)</label>
      <textarea
        className={inputClass}
        rows={3}
        value={checklist.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n'))}
      />
    </div>
  );
}
