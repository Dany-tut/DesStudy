'use client';

import { useState } from 'react';
import {
  GripVertical,
  Layers,
  Square,
  Type,
  Palette,
  Ruler,
  Info,
} from 'lucide-react';

/**
 * Design-system entry for the teacher-facing screen-critique editor. The product
 * owner picked scope **C — «Полный редактор экрана»**: the teacher authors the
 * mockup itself (blocks, colours, radii, text) with a visual builder, then marks
 * any block as a critique zone and grades it. NOT wired to any API — every input
 * is local mock state. Grading model: a zone may have a SET of fully-correct
 * roles and a SET of fully-correct defects (green), plus separate «спорные»
 * sets (yellow).
 */

export function CritiqueEditorVariants() {
  return (
    <div>
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-border bg-elevated px-4 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-brand" />
        <div>
          <p className="text-footnote text-secondary">
            Учитель сам собирает макет (блоки, цвета, радиусы, текст) — визуальный конструктор, — затем помечает любой блок зоной критики и задаёт её критерии.
          </p>
          <p className="mt-1 text-caption text-tertiary">Выбранный вариант · фактически мини-Figma</p>
        </div>
      </div>

      <FullEditor />
    </div>
  );
}

// ── Full visual mockup builder (mock) ────────────────────────────────────────

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
