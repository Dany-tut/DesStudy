'use client';

import { useState } from 'react';
import {
  Check,
  Plus,
  X,
  GripVertical,
  Move,
  Layers,
  Square,
  Type,
  Palette,
  Ruler,
  Info,
} from 'lucide-react';
import { CRITIQUE_ROLES, CRITIQUE_DEFECTS } from '@/lib/curriculum/screenCritique';
import type { CritiqueRoleId, CritiqueDefectId } from '@/lib/curriculum/types';

/**
 * Design-system-only showcase: three candidate shapes for the teacher-facing
 * screen-critique editor, so the product owner can pick a scope. NOT wired to
 * any API — every input is local mock state. All three assume the confirmed
 * grading model: a zone may have a SET of fully-correct roles and a SET of
 * fully-correct defects (green), plus separate "спорные" sets (yellow).
 *
 *   A — «Только критерии»   : edit grading per fixed, code-drawn zone.
 *   B — «Критерии + зоны»   : A, plus add/move/delete the hotspots on the screen.
 *   C — «Полный редактор»   : B, plus author the mockup itself (visual builder).
 */

// A representative zone the teacher would grade (mirrors the "Премиум карта" scene).
const MOCK_ZONES = ['Топ-бар', 'Шапка с балансом', 'Чипы карты', 'Быстрые действия', 'Промо-вклад', 'Бонусы'];

type Variant = 'criteria' | 'zones' | 'full';

const VARIANTS: { id: Variant; title: string; scope: string; effort: string }[] = [
  {
    id: 'criteria',
    title: 'A · Только критерии',
    scope: 'Экран и зоны заданы в коде. Учитель правит оценку каждой зоны: верные роли и дефекты, спорные, заметки, интент, варианты починки.',
    effort: 'Небольшой объём · закрывает «все критерии»',
  },
  {
    id: 'zones',
    title: 'B · Критерии + зоны',
    scope: 'То же, плюс учитель добавляет/двигает/удаляет кликабельные зоны поверх экрана и задаёт их координаты. Визуал экрана всё ещё кодовый.',
    effort: 'Средний объём · нужен оверлей-редактор хотспотов',
  },
  {
    id: 'full',
    title: 'C · Полный редактор экрана',
    scope: 'Учитель сам собирает макет (блоки, цвета, радиусы, текст) — визуальный конструктор. Максимум свободы, отдельный крупный проект.',
    effort: 'Большой объём · фактически мини-Figma',
  },
];

export function CritiqueEditorVariants() {
  const [variant, setVariant] = useState<Variant>('criteria');

  return (
    <div>
      {/* Variant switcher */}
      <div className="mb-5 inline-flex rounded-xl border border-border bg-canvas p-1">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVariant(v.id)}
            className={[
              'rounded-lg px-4 py-2 text-footnote font-medium transition-fast',
              variant === v.id ? 'bg-brand text-on-brand' : 'text-secondary hover:text-primary',
            ].join(' ')}
          >
            {v.title}
          </button>
        ))}
      </div>

      {/* Scope caption */}
      {VARIANTS.filter((v) => v.id === variant).map((v) => (
        <div key={v.id} className="mb-5 flex items-start gap-2 rounded-lg border border-border bg-elevated px-4 py-3">
          <Info size={15} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <p className="text-footnote text-secondary">{v.scope}</p>
            <p className="mt-1 text-caption text-tertiary">{v.effort}</p>
          </div>
        </div>
      ))}

      {variant === 'criteria' && <CriteriaEditor />}
      {variant === 'zones' && <ZonesEditor />}
      {variant === 'full' && <FullEditor />}
    </div>
  );
}

// ── Shared: the per-zone criteria panel (the heart of all three variants) ─────

function CriteriaPanel() {
  // Multiple fully-correct roles/defects (green) + separate debatable (yellow).
  const [correctRoles, setCorrectRoles] = useState<CritiqueRoleId[]>(['secondary', 'accent']);
  const [debatableRoles, setDebatableRoles] = useState<CritiqueRoleId[]>(['neutral']);
  const [correctDefects, setCorrectDefects] = useState<CritiqueDefectId[]>(['radius', 'consistency', 'typography']);
  const [debatableDefects, setDebatableDefects] = useState<CritiqueDefectId[]>(['hierarchy']);
  const [fixes, setFixes] = useState([
    { id: 'unify', label: 'Привести скругления к одному радиусу', correct: true },
    { id: 'copy', label: 'Переписать заголовок короче и по делу', correct: false },
    { id: 'square', label: 'Сделать оба элемента прямоугольными', correct: false },
  ]);

  const toggle = <T,>(list: T[], set: (v: T[]) => void, id: T) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="space-y-5">
      {/* Roles */}
      <CriteriaGroup
        label="Роли зоны"
        hint="Отметь ВСЕ полностью верные (зелёные) и, отдельно, спорные (жёлтые)"
      >
        {CRITIQUE_ROLES.map((r) => (
          <TriStateChip
            key={r.id}
            label={r.label}
            state={correctRoles.includes(r.id) ? 'correct' : debatableRoles.includes(r.id) ? 'debatable' : 'off'}
            onCorrect={() => {
              toggle(correctRoles, setCorrectRoles, r.id);
              setDebatableRoles((d) => d.filter((x) => x !== r.id));
            }}
            onDebatable={() => {
              toggle(debatableRoles, setDebatableRoles, r.id);
              setCorrectRoles((c) => c.filter((x) => x !== r.id));
            }}
          />
        ))}
      </CriteriaGroup>

      {/* Defects */}
      <CriteriaGroup
        label="Дефекты зоны"
        hint="Можно несколько верных сразу — напр. «разнобой скруглений» + «плохой текст»"
      >
        {CRITIQUE_DEFECTS.map((d) => (
          <TriStateChip
            key={d.id}
            label={d.label}
            state={correctDefects.includes(d.id) ? 'correct' : debatableDefects.includes(d.id) ? 'debatable' : 'off'}
            onCorrect={() => {
              toggle(correctDefects, setCorrectDefects, d.id);
              setDebatableDefects((x) => x.filter((y) => y !== d.id));
            }}
            onDebatable={() => {
              toggle(debatableDefects, setDebatableDefects, d.id);
              setCorrectDefects((x) => x.filter((y) => y !== d.id));
            }}
          />
        ))}
      </CriteriaGroup>

      {/* Notes + intent */}
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Заметка о роли" placeholder="Почему это второстепенное, но «главным» назвать защитимо…" />
        <TextField label="Заметка о дефекте" placeholder="Что именно сломано и почему это первично…" />
      </div>
      <TextField label="Design intent (для ИИ-оценки текстовой правки)" placeholder="Как зона должна выглядеть в идеале…" />

      {/* Fix options */}
      <CriteriaGroup label="Варианты починки" hint="Ровно один помечается верным — он «пересобирает» экран">
        <div className="w-full space-y-2">
          {fixes.map((f, i) => (
            <div key={f.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFixes((prev) => prev.map((x) => ({ ...x, correct: x.id === f.id })))}
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-fast',
                  f.correct ? 'border-[#3FB950] bg-[#3FB950] text-on-brand' : 'border-border',
                ].join(' ')}
                aria-label="Верный вариант"
              >
                {f.correct && <Check size={12} strokeWidth={3} />}
              </button>
              <input
                defaultValue={f.label}
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary"
              />
              <button
                type="button"
                onClick={() => setFixes((prev) => prev.filter((x) => x.id !== f.id))}
                className="shrink-0 text-tertiary hover:text-danger"
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFixes((prev) => [...prev, { id: `fix-${prev.length}`, label: '', correct: false }])}
            className="flex items-center gap-1 text-footnote text-brand hover:underline"
          >
            <Plus size={14} /> Добавить вариант
          </button>
        </div>
      </CriteriaGroup>
    </div>
  );
}

// ── Variant A: zone tabs + criteria panel ────────────────────────────────────

function CriteriaEditor() {
  const [zone, setZone] = useState(2); // "Чипы карты"
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-5 flex flex-wrap gap-1.5">
        {MOCK_ZONES.map((z, i) => (
          <button
            key={z}
            type="button"
            onClick={() => setZone(i)}
            className={[
              'rounded-full border px-3 py-1.5 text-caption font-medium transition-fast',
              zone === i ? 'border-brand bg-brand/10 text-brand' : 'border-border bg-canvas text-secondary hover:border-brand/40',
            ].join(' ')}
          >
            {z}
          </button>
        ))}
      </div>
      <p className="mb-4 text-callout font-semibold text-primary">Зона: {MOCK_ZONES[zone]}</p>
      <CriteriaPanel />
    </div>
  );
}

// ── Variant B: screen with editable hotspots + criteria panel ────────────────

const HOTSPOTS = [
  { id: 'z1', label: 'Шапка', top: '8%', left: '6%', w: '88%', h: '16%' },
  { id: 'z2', label: 'Действия', top: '30%', left: '6%', w: '88%', h: '14%' },
  { id: 'z3', label: 'Промо', top: '48%', left: '6%', w: '88%', h: '16%' },
  { id: 'z4', label: 'Бонусы', top: '68%', left: '6%', w: '88%', h: '22%' },
];

function ZonesEditor() {
  const [active, setActive] = useState('z1');
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Screen with draggable hotspots (mock) */}
      <div>
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-border bg-canvas">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,110,240,0.18),transparent_60%)]" />
          {HOTSPOTS.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setActive(h.id)}
              style={{ top: h.top, left: h.left, width: h.w, height: h.h }}
              className={[
                'absolute flex items-start justify-between rounded-lg border-2 p-1.5 text-caption font-medium transition-fast',
                active === h.id
                  ? 'border-brand bg-brand/15 text-brand'
                  : 'border-dashed border-tertiary/50 bg-surface/40 text-tertiary hover:border-brand/50',
              ].join(' ')}
            >
              <span className="rounded bg-canvas/80 px-1">{h.label}</span>
              <Move size={12} className="opacity-60" />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-footnote text-brand hover:bg-brand/5"
        >
          <Plus size={14} /> Добавить зону
        </button>
      </div>

      {/* Coordinates + criteria for the active hotspot */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-callout font-semibold text-primary">
            Зона: {HOTSPOTS.find((h) => h.id === active)?.label}
          </p>
          <button type="button" className="flex items-center gap-1 text-caption text-tertiary hover:text-danger">
            <X size={13} /> Удалить зону
          </button>
        </div>
        <div className="mb-5 grid grid-cols-4 gap-2">
          {['X', 'Y', 'W', 'H'].map((k) => (
            <label key={k} className="block">
              <span className="mb-1 block text-caption text-tertiary">{k}</span>
              <input
                defaultValue={k === 'X' || k === 'Y' ? '6' : k === 'H' ? '16' : '88'}
                className="w-full rounded-lg border border-border bg-canvas px-2 py-1.5 text-footnote tabular-nums text-primary"
              />
            </label>
          ))}
        </div>
        <CriteriaPanel />
      </div>
    </div>
  );
}

// ── Variant C: full visual mockup builder (mock) ─────────────────────────────

const LAYERS = [
  { id: 'l1', name: 'Шапка · Frame', icon: Square, depth: 0 },
  { id: 'l2', name: 'Баланс · Text', icon: Type, depth: 1 },
  { id: 'l3', name: 'Действия · Row', icon: Layers, depth: 0 },
  { id: 'l4', name: 'Промо · Card', icon: Square, depth: 0 },
  { id: 'l5', name: 'Заголовок оффера · Text', icon: Type, depth: 1 },
];

function FullEditor() {
  const [sel, setSel] = useState('l4');
  return (
    <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_220px]">
      {/* Layers */}
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="mb-2 px-1 text-caption font-medium uppercase tracking-wide text-tertiary">Слои</p>
        <div className="space-y-0.5">
          {LAYERS.map((l) => {
            const Icon = l.icon;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setSel(l.id)}
                style={{ paddingLeft: 8 + l.depth * 16 }}
                className={[
                  'flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-caption transition-fast',
                  sel === l.id ? 'bg-brand/10 text-brand' : 'text-secondary hover:bg-hover',
                ].join(' ')}
              >
                <GripVertical size={11} className="opacity-40" />
                <Icon size={13} />
                <span className="truncate">{l.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex items-center justify-center rounded-xl border border-border bg-canvas p-6">
        <div className="w-full max-w-[240px] space-y-3">
          <div className="rounded-xl bg-elevated p-4">
            <p className="text-caption text-tertiary">Название карты</p>
            <p className="text-title3 font-bold text-primary">980 000 ₽</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['Оплатить', 'Пополнить', 'Перевести'].map((a) => (
              <div key={a} className="rounded-lg bg-elevated py-3 text-center text-caption text-secondary">{a}</div>
            ))}
          </div>
          <div className="rounded-2xl bg-brand/80 p-4 ring-2 ring-brand ring-offset-2 ring-offset-canvas">
            <p className="text-footnote font-semibold text-on-brand">Откройте вклад со ставкой до 18%</p>
          </div>
        </div>
      </div>

      {/* Inspector */}
      <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-caption font-medium uppercase tracking-wide text-tertiary">Свойства · Промо</p>
        <InspectorRow icon={Ruler} label="Радиус">
          <input defaultValue="16" className="w-16 rounded border border-border bg-canvas px-2 py-1 text-caption tabular-nums text-primary" />
        </InspectorRow>
        <InspectorRow icon={Palette} label="Фон">
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded bg-brand" />
            <span className="text-caption tabular-nums text-secondary">#7A6EF0</span>
          </span>
        </InspectorRow>
        <InspectorRow icon={Type} label="Текст">
          <input defaultValue="15 / 600" className="w-16 rounded border border-border bg-canvas px-2 py-1 text-caption tabular-nums text-primary" />
        </InspectorRow>
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-caption text-tertiary">Пометить как зону критики</p>
          <button type="button" className="w-full rounded-lg bg-brand/10 py-2 text-footnote font-medium text-brand hover:bg-brand/15">
            + Сделать зоной → задать критерии
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small building blocks ────────────────────────────────────────────────────

function CriteriaGroup({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-footnote font-medium text-primary">{label}</p>
      <p className="mb-2 text-caption text-tertiary">{hint}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * A criterion chip with three states: off → green (полностью верно) → the small
 * side dot toggles «спорно» (yellow). Click body cycles off/correct; click the
 * dot toggles debatable.
 */
function TriStateChip({
  label,
  state,
  onCorrect,
  onDebatable,
}: {
  label: string;
  state: 'off' | 'correct' | 'debatable';
  onCorrect: () => void;
  onDebatable: () => void;
}) {
  const ring =
    state === 'correct'
      ? 'border-[#3FB950] bg-[#3FB950]/12 text-[#3FB950]'
      : state === 'debatable'
        ? 'border-[#E3B341] bg-[#E3B341]/12 text-[#E3B341]'
        : 'border-border bg-canvas text-secondary hover:border-brand/40';
  return (
    <span className={['inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-caption font-medium transition-fast', ring].join(' ')}>
      <button type="button" onClick={onCorrect} className="flex items-center gap-1.5">
        {state === 'correct' && <Check size={12} strokeWidth={3} />}
        {label}
      </button>
      <button
        type="button"
        onClick={onDebatable}
        title="Пометить спорным"
        className={[
          'flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold transition-fast',
          state === 'debatable' ? 'border-[#E3B341] bg-[#E3B341] text-canvas' : 'border-current opacity-40 hover:opacity-100',
        ].join(' ')}
      >
        ?
      </button>
    </span>
  );
}

function TextField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption text-secondary">{label}</span>
      <textarea
        rows={2}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary placeholder:text-tertiary"
      />
    </label>
  );
}

function InspectorRow({ icon: Icon, label, children }: { icon: typeof Ruler; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-caption text-secondary">
        <Icon size={13} className="text-tertiary" /> {label}
      </span>
      {children}
    </div>
  );
}
