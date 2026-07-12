'use client';

import { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { OrderExercise, OrderItem } from '@/lib/curriculum/types';

/**
 * Drag-and-drop canvas: the learner arranges cards into the correct order
 * (e.g. typographic hierarchy). HTML5 drag is the primary interaction; ↑/↓
 * buttons provide an accessible, keyboard-friendly alternative. State is the
 * ordered list of item ids, validated deterministically upstream.
 */
export function OrderCanvas({
  exercise,
  value,
  disabled,
  onChange,
}: {
  exercise: OrderExercise;
  value: string[];
  disabled: boolean;
  onChange: (order: string[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  const byId = new Map(exercise.items.map((i) => [i.id, i]));

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function onDrop(targetId: string) {
    if (dragId === null || dragId === targetId) return;
    move(value.indexOf(dragId), value.indexOf(targetId));
    setDragId(null);
  }

  return (
    <div className="canvas-grid rounded-xl border border-border bg-canvas p-4">
      <ul className="flex flex-col gap-2">
        {value.map((id, index) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <li
              key={id}
              draggable={!disabled}
              onDragStart={() => setDragId(id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(id)}
              onDragEnd={() => setDragId(null)}
              className={[
                'flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 transition-fast',
                dragId === id ? 'border-brand opacity-60' : 'border-border',
                disabled ? '' : 'cursor-grab active:cursor-grabbing hover:border-border-strong',
              ].join(' ')}
            >
              <GripVertical size={16} className="shrink-0 text-tertiary" />
              <span className="flex-1 truncate">
                <ItemLabel item={item} />
              </span>
              {!disabled && (
                <span className="flex shrink-0 flex-col">
                  <button
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`${item.label}: вверх`}
                    className="flex h-5 w-6 items-center justify-center rounded text-tertiary transition-fast hover:text-primary disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => move(index, index + 1)}
                    disabled={index === value.length - 1}
                    aria-label={`${item.label}: вниз`}
                    className="flex h-5 w-6 items-center justify-center rounded text-tertiary transition-fast hover:text-primary disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 px-1 text-caption text-tertiary">
        Перетащи карточки (или используй ↑/↓), чтобы задать правильный порядок.
      </p>
    </div>
  );
}

function ItemLabel({ item }: { item: OrderItem }) {
  const cls: Record<NonNullable<OrderItem['size']>, string> = {
    display: 'text-title2 font-bold text-primary',
    title: 'text-title3 font-semibold text-primary',
    body: 'text-body text-secondary',
    caption: 'text-caption text-tertiary',
    button: 'text-footnote font-medium text-on-brand bg-brand rounded-md px-3 py-1 inline-block',
  };
  return <span className={item.size ? cls[item.size] : 'text-body text-primary'}>{item.label}</span>;
}
