'use client';

import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';

/**
 * DRAFT exercise — "focus-order": a mock form whose fields are scattered in a
 * non-obvious visual layout. The learner clicks the interactive elements in the
 * order a keyboard Tab would visit them (logical top→bottom, left→right reading
 * order). Correct clicks get a numbered badge; a wrong click flags and resets so
 * the whole sequence must read cleanly — training the gap between visual
 * placement and DOM/focus order. Self-contained; own state.
 */

type Field = {
  id: string;
  label: string;
  kind: 'input' | 'button' | 'link';
  /** Absolute position inside the mock screen (%), deliberately non-linear. */
  x: number;
  y: number;
  w: number;
};

/** The five nodes, listed here already in the correct focus order (0..4). */
const FIELDS: Field[] = [
  { id: 'name', label: 'Имя', kind: 'input', x: 6, y: 8, w: 52 },
  { id: 'email', label: 'E-mail', kind: 'input', x: 6, y: 40, w: 52 },
  { id: 'promo', label: 'Промокод', kind: 'input', x: 64, y: 24, w: 30 },
  { id: 'help', label: 'Нужна помощь?', kind: 'link', x: 6, y: 74, w: 40 },
  { id: 'submit', label: 'Отправить', kind: 'button', x: 62, y: 72, w: 32 },
];

const ORDER = FIELDS.map((f) => f.id);

export function FocusOrder() {
  const [seq, setSeq] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);

  const solved = seq.length === ORDER.length;

  function click(id: string) {
    if (solved) return;
    const expected = ORDER[seq.length];
    if (id === expected) {
      setWrong(null);
      setSeq((s) => [...s, id]);
    } else {
      // Flag the misstep briefly, then reset the run.
      setWrong(id);
      setSeq([]);
    }
  }

  function reset() {
    setSeq([]);
    setWrong(null);
  }

  return (
    <div className="w-full max-w-[520px] rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Задание</p>
          <p className="mt-1 text-callout font-semibold text-primary">
            Кликай элементы в порядке обхода клавишей Tab
          </p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold transition-base min-w-[7rem]',
            solved ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          <Check size={13} strokeWidth={3} />
          {solved ? 'Готово' : `${seq.length} / ${ORDER.length}`}
        </span>
      </div>

      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border bg-canvas">
        {FIELDS.map((f) => {
          const idx = seq.indexOf(f.id);
          const done = idx !== -1;
          const isWrong = wrong === f.id;
          const base =
            f.kind === 'input'
              ? 'h-10 items-center border bg-surface text-tertiary'
              : f.kind === 'button'
                ? 'h-10 items-center justify-center bg-brand text-on-brand'
                : 'h-8 items-center text-brand underline underline-offset-2';
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => click(f.id)}
              disabled={solved}
              className={[
                'absolute flex rounded-lg px-3 text-footnote font-medium transition-fast',
                base,
                done ? 'ring-2 ring-success' : isWrong ? 'ring-2 ring-danger' : 'ring-0',
                f.kind === 'link' ? 'border-0 bg-transparent px-1' : '',
              ].join(' ')}
              style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%` }}
            >
              <span className="truncate">{f.label}</span>
              {done && (
                <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-success text-caption font-bold text-on-brand">
                  {idx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="min-w-0 text-footnote text-secondary">
          {solved
            ? 'Верно — визуальная раскладка не диктует порядок фокуса, его задаёт логика чтения.'
            : wrong
              ? 'Не тот элемент — фокус идёт сверху вниз по смыслу, а не по близости на экране.'
              : 'Обход должен читаться как форма: поля сверху вниз, затем действия.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-semibold text-secondary transition-fast hover:bg-hover active:bg-pressed"
        >
          <RotateCcw size={13} /> Сброс
        </button>
      </div>
    </div>
  );
}
