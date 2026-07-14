'use client';

import { useEffect, useRef, useState } from 'react';
import { Move, Check } from 'lucide-react';
import type { AlignAnswer } from '@/lib/curriculum/types';

const FRAME_H = 260;
const BOX_W = 112;
const BOX_H = 76;
const INSET = 16; // edge guide inset
const SNAP = 12; // snap radius in px
const GRID = 8; // 8pt grid

type XAlign = 'left' | 'center' | 'right' | null;
type YAlign = 'top' | 'middle' | 'bottom' | null;

type Goal = {
  x: Exclude<XAlign, null>;
  y: Exclude<YAlign, null>;
  title: string;
};

const GOALS: Goal[] = [
  { x: 'center', y: 'middle', title: 'Выровняй карточку по центру' },
  { x: 'left', y: 'top', title: 'Прижми карточку к левому верхнему углу' },
  { x: 'right', y: 'bottom', title: 'Прижми карточку к правому нижнему углу' },
  { x: 'right', y: 'top', title: 'Выровняй карточку по правому верхнему краю' },
];

const X_LABEL: Record<Exclude<XAlign, null>, string> = {
  left: 'по левому краю',
  center: 'по центру',
  right: 'по правому краю',
};
const Y_LABEL: Record<Exclude<YAlign, null>, string> = {
  top: 'по верху',
  middle: 'посередине',
  bottom: 'по низу',
};

/** Left-edge x-positions of the box for each x guide (given frame width). */
function xCandidates(w: number) {
  return { left: INSET, center: (w - BOX_W) / 2, right: w - INSET - BOX_W };
}
/** Top-edge y-positions of the box for each y guide. */
function yCandidates() {
  return { top: INSET, middle: (FRAME_H - BOX_H) / 2, bottom: FRAME_H - INSET - BOX_H };
}

function nearestSnap<K extends string>(value: number, cands: Record<K, number>): { key: K | null; value: number } {
  let bestKey: K | null = null;
  let best = Infinity;
  (Object.keys(cands) as K[]).forEach((k) => {
    const d = Math.abs(cands[k] - value);
    if (d < best) {
      best = d;
      bestKey = k;
    }
  });
  if (bestKey !== null && best <= SNAP) return { key: bestKey, value: cands[bestKey] };
  return { key: null, value: Math.round(value / GRID) * GRID };
}

/**
 * DRAFT exercise — "align": drag the card, it magnetically snaps to alignment
 * guides (left / center / right, top / middle / bottom) on an 8pt grid.
 * Fully self-contained; own state. Shown in the design-system showcase.
 */
export function AlignSnap({
  target,
  disabled,
  onChange,
}: {
  target?: AlignAnswer;
  disabled?: boolean;
  onChange?: (align: { x: string | null; y: string | null }) => void;
} = {}) {
  const controlled = onChange !== undefined;
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const grabRef = useRef({ x: 0, y: 0 });

  const [pos, setPos] = useState({ left: 20, top: 20 });
  const [frameW, setFrameW] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [goalIdx, setGoalIdx] = useState(0);

  const goal: Goal = target
    ? { x: target.x, y: target.y, title: '' }
    : GOALS[goalIdx];

  // Derive current alignment from pos (only reliable once frame is measured).
  const cx = frameW ? xCandidates(frameW) : null;
  const cy = yCandidates();
  const xAlign: XAlign = cx
    ? (['left', 'center', 'right'] as const).find((k) => Math.abs(cx[k] - pos.left) < 1) ?? null
    : null;
  const yAlign: YAlign =
    (['top', 'middle', 'bottom'] as const).find((k) => Math.abs(cy[k] - pos.top) < 1) ?? null;

  const solved = frameW > 0 && xAlign === goal.x && yAlign === goal.y;

  // In controlled (exercise) mode, report the current alignment up so the player
  // can validate it against the target.
  useEffect(() => {
    if (controlled) onChange!({ x: xAlign, y: yAlign });
  }, [xAlign, yAlign, controlled]); // eslint-disable-line react-hooks/exhaustive-deps

  function measure() {
    const rect = frameRef.current?.getBoundingClientRect();
    if (rect) setFrameW(rect.width);
    return rect;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const rect = measure();
    if (!rect) return;
    grabRef.current = { x: e.clientX - rect.left - pos.left, y: e.clientY - rect.top - pos.top };
    draggingRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (rect.width !== frameW) setFrameW(rect.width);

    let left = e.clientX - rect.left - grabRef.current.x;
    let top = e.clientY - rect.top - grabRef.current.y;
    left = Math.min(rect.width - BOX_W, Math.max(0, left));
    top = Math.min(FRAME_H - BOX_H, Math.max(0, top));

    left = nearestSnap(left, xCandidates(rect.width)).value;
    top = nearestSnap(top, yCandidates()).value;
    left = Math.min(rect.width - BOX_W, Math.max(0, left));
    top = Math.min(FRAME_H - BOX_H, Math.max(0, top));

    setPos({ left, top });
  }

  function onPointerUp() {
    draggingRef.current = false;
    setDragging(false);
  }

  function nextGoal() {
    setGoalIdx((i) => (i + 1) % GOALS.length);
    setPos({ left: 20, top: 20 });
  }

  const guideActive = (axis: 'x' | 'y', key: string) =>
    axis === 'x' ? xAlign === key : yAlign === key;

  return (
    <div className={controlled ? 'w-full max-w-[420px]' : 'w-full max-w-[420px] rounded-2xl border border-border bg-surface p-5'}>
      {/* Header: goal + check (standalone only — player shows prompt & verdict) */}
      {!controlled && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Задание</p>
            <p className="mt-1 text-callout font-semibold text-primary">{goal.title}</p>
          </div>
          <span
            className={[
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold transition-base',
              solved ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
            ].join(' ')}
          >
            <Check size={13} strokeWidth={3} />
            {solved ? 'Готово' : 'В процессе'}
          </span>
        </div>
      )}

      {/* Frame */}
      <div
        ref={frameRef}
        className="relative overflow-hidden rounded-xl border border-border bg-canvas"
        style={{ height: FRAME_H }}
      >
        {/* Vertical guides (x): left / center / right */}
        <div className={solved ? 'opacity-40 transition-fast' : 'transition-fast'} style={{ position: 'absolute', inset: 0 }}>
        <div
          className={['absolute top-0 bottom-0 transition-fast', guideActive('x', 'left') ? 'bg-brand' : 'bg-border'].join(' ')}
          style={{ left: INSET, width: guideActive('x', 'left') ? 2 : 1 }}
        />
        <div
          className={['absolute top-0 bottom-0 transition-fast', guideActive('x', 'center') ? 'bg-brand' : 'bg-border'].join(' ')}
          style={{ left: '50%', width: guideActive('x', 'center') ? 2 : 1, transform: 'translateX(-50%)' }}
        />
        <div
          className={['absolute top-0 bottom-0 transition-fast', guideActive('x', 'right') ? 'bg-brand' : 'bg-border'].join(' ')}
          style={{ right: INSET, width: guideActive('x', 'right') ? 2 : 1 }}
        />
        {/* Horizontal guides (y): top / middle / bottom */}
        <div
          className={['absolute left-0 right-0 transition-fast', guideActive('y', 'top') ? 'bg-brand' : 'bg-border'].join(' ')}
          style={{ top: INSET, height: guideActive('y', 'top') ? 2 : 1 }}
        />
        <div
          className={['absolute left-0 right-0 transition-fast', guideActive('y', 'middle') ? 'bg-brand' : 'bg-border'].join(' ')}
          style={{ top: '50%', height: guideActive('y', 'middle') ? 2 : 1, transform: 'translateY(-50%)' }}
        />
        <div
          className={['absolute left-0 right-0 transition-fast', guideActive('y', 'bottom') ? 'bg-brand' : 'bg-border'].join(' ')}
          style={{ bottom: INSET, height: guideActive('y', 'bottom') ? 2 : 1 }}
        />
        </div>

        {/* Draggable card */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Перетащи карточку"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={[
            'absolute flex touch-none select-none flex-col justify-between rounded-lg border p-3 shadow-md transition-fast',
            solved ? 'border-success bg-success/10' : 'border-border-strong bg-elevated',
            dragging ? 'cursor-grabbing shadow-lg ring-2 ring-brand/40' : 'cursor-grab',
          ].join(' ')}
          style={{ left: pos.left, top: pos.top, width: BOX_W, height: BOX_H }}
        >
          <div className="flex items-center justify-between">
            <span className="text-footnote font-semibold text-primary">Карточка</span>
            <Move size={14} className="text-tertiary" />
          </div>
          <div className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
      </div>

      {/* Readout + control */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className={[
              'truncate text-body font-semibold transition-base',
              xAlign || yAlign ? 'text-brand' : 'text-secondary',
            ].join(' ')}
          >
            {xAlign && yAlign
              ? `${X_LABEL[xAlign][0].toUpperCase()}${X_LABEL[xAlign].slice(1)} · ${Y_LABEL[yAlign]}`
              : xAlign
                ? `${X_LABEL[xAlign][0].toUpperCase()}${X_LABEL[xAlign].slice(1)}`
                : yAlign
                  ? `${Y_LABEL[yAlign][0].toUpperCase()}${Y_LABEL[yAlign].slice(1)}`
                  : 'Свободно'}
          </p>
          <p className="mt-1 text-caption tabular-nums text-tertiary">
            x {Math.round(pos.left)} · y {Math.round(pos.top)} · сетка 8pt
          </p>
        </div>
        {!controlled && (
          <button
            type="button"
            onClick={nextGoal}
            className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-semibold text-secondary transition-fast hover:bg-hover active:bg-pressed"
          >
            Другая цель
          </button>
        )}
      </div>
    </div>
  );
}
