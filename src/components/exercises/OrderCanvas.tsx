'use client';

import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { OrderExercise, OrderItem } from '@/lib/curriculum/types';
import { useT } from '@/lib/i18n/client';

/**
 * Drag-and-drop canvas: the learner arranges cards into the correct order.
 * Pointer/touch dragging is handled by framer-motion's Reorder (robust across
 * mouse, trackpad and touch — replaces the brittle hand-rolled HTML5 DnD).
 * ↑/↓ buttons remain as the keyboard/accessible alternative.
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
  const { t } = useT();
  const byId = new Map(exercise.items.map((i) => [i.id, i]));

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className="canvas-grid rounded-xl border border-border bg-canvas p-4">
      <Reorder.Group
        axis="y"
        values={value}
        onReorder={onChange}
        className="flex flex-col gap-2"
      >
        {value.map((id, index) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <OrderRow
              key={id}
              id={id}
              item={item}
              index={index}
              total={value.length}
              disabled={disabled}
              onMove={move}
              t={t}
            />
          );
        })}
      </Reorder.Group>
      <p className="mt-3 px-1 text-caption text-tertiary">
        {t('exercises.order.hint')}
      </p>
    </div>
  );
}

function OrderRow({
  id,
  item,
  index,
  total,
  disabled,
  onMove,
  t,
}: {
  id: string;
  item: OrderItem;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
      onPointerDown={(e: React.PointerEvent) => {
        if (disabled) return;
        // Start the drag from anywhere on the card, and stop the browser from
        // turning the press-and-drag into a text selection.
        controls.start(e);
        e.preventDefault();
      }}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      className={[
        'flex select-none items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5',
        disabled ? '' : 'cursor-grab touch-none hover:border-border-strong active:cursor-grabbing',
      ].join(' ')}
    >
      <GripVertical
        size={16}
        className={[
          'shrink-0 text-tertiary transition-fast',
          disabled ? '' : 'hover:text-primary',
        ].join(' ')}
      />
      <span className="flex-1 truncate">
        <ItemLabel item={item} />
      </span>
      {!disabled && (
        <span className="flex shrink-0 flex-col" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            aria-label={t('exercises.order.moveUp', { label: item.label })}
            className="flex h-5 w-6 items-center justify-center rounded text-tertiary transition-fast hover:text-primary disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
            aria-label={t('exercises.order.moveDown', { label: item.label })}
            className="flex h-5 w-6 items-center justify-center rounded text-tertiary transition-fast hover:text-primary disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
        </span>
      )}
    </Reorder.Item>
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
