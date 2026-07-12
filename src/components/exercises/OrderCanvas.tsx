'use client';

import { Fragment, useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { OrderExercise, OrderItem } from '@/lib/curriculum/types';

type DropTarget = { id: string; pos: 'before' | 'after' };

/**
 * Drag-and-drop canvas: the learner arranges cards into the correct order.
 * HTML5 drag is primary; ↑/↓ buttons are the accessible alternative. While
 * dragging, a brand insertion line shows exactly where the card will land
 * (before/after the hovered card, based on cursor position).
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
  const [over, setOver] = useState<DropTarget | null>(null);

  const byId = new Map(exercise.items.map((i) => [i.id, i]));

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  /** Insert dragId relative to a target, honoring before/after. */
  function reorder(target: DropTarget) {
    if (dragId === null) return;
    const next = value.filter((x) => x !== dragId);
    let idx = next.indexOf(target.id);
    if (target.pos === 'after') idx += 1;
    next.splice(idx, 0, dragId);
    onChange(next);
  }

  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (dragId === null || id === dragId) {
      setOver(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setOver((prev) => (prev?.id === id && prev.pos === pos ? prev : { id, pos }));
  }

  function endDrag() {
    setDragId(null);
    setOver(null);
  }

  return (
    <div className="canvas-grid rounded-xl border border-border bg-canvas p-4">
      <ul className="flex flex-col gap-2">
        {value.map((id, index) => {
          const item = byId.get(id);
          if (!item) return null;
          const showBefore = over?.id === id && over.pos === 'before';
          const showAfter = over?.id === id && over.pos === 'after';
          return (
            <Fragment key={id}>
              {showBefore && <InsertLine />}
              <li
                draggable={!disabled}
                onDragStart={() => setDragId(id)}
                onDragOver={(e) => onDragOver(e, id)}
                onDrop={() => {
                  if (over) reorder(over);
                  endDrag();
                }}
                onDragEnd={endDrag}
                className={[
                  'flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 transition-fast',
                  dragId === id ? 'border-brand opacity-50' : 'border-border',
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
              {showAfter && <InsertLine />}
            </Fragment>
          );
        })}
      </ul>
      <p className="mt-3 px-1 text-caption text-tertiary">
        Перетащи карточки (или используй ↑/↓), чтобы задать правильный порядок.
      </p>
    </div>
  );
}

/** The insertion indicator — a brand line marking where the card will land. */
function InsertLine() {
  return (
    <li className="pointer-events-none -my-1 flex items-center gap-2" aria-hidden>
      <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
      <span className="h-0.5 flex-1 rounded-full bg-brand" />
    </li>
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
