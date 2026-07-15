'use client';

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Check, X } from 'lucide-react';

/**
 * Interactive micro-engagements for reading-only lectures — the "разбавить
 * лекцию интерактивом" pieces. Not graded exercises: they exist to make the
 * reader pause and think for a second instead of scrolling past a wall of text.
 * Routed by `visual` key through {@link LectureVisual}.
 */
export function LectureInteractive({ visual }: { visual: string }): React.ReactElement | null {
  if (visual === 'da-beauty-vs-work') return <BeautyVsWork />;
  if (visual === 'da-first-look') return <ThinkReveal />;
  if (visual === 'da-myths') return <MythBuster />;
  return null;
}

/** Keys handled here — lets the router check before falling through. */
export const LECTURE_INTERACTIVE_KEYS = ['da-beauty-vs-work', 'da-first-look', 'da-myths'];

// ─────────────────────────────────────────────────────────────
// 1. Before/After comparison slider — «красиво» vs «работает».
//    Same signup screen: one glossy but unreadable, one plain but clear.
// ─────────────────────────────────────────────────────────────

function BeautyVsWork() {
  const [pos, setPos] = useState(50);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  return (
    <div className="rounded-xl border border-border bg-canvas p-4">
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          update(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && update(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        className="relative aspect-[16/10] w-full cursor-ew-resize select-none overflow-hidden rounded-lg"
      >
        {/* AFTER — понятный экран (base layer, right side) */}
        <div className="absolute inset-0">
          <ClearScreen />
          <Tag className="right-3 top-3 border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
            понятно
          </Tag>
        </div>

        {/* BEFORE — красивый, но нечитаемый (clipped by slider, left side) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <PrettyScreen />
          <Tag className="left-3 top-3 border-rose-400/40 bg-rose-500/15 text-rose-300">
            красиво
          </Tag>
        </div>

        {/* Handle */}
        <div
          className="pointer-events-none absolute inset-y-0 z-10 flex items-center"
          style={{ left: `calc(${pos}% - 1px)` }}
        >
          <div className="h-full w-0.5 bg-white/80 shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
          <div className="absolute left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-neutral-800 shadow-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 6 3 12l6 6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>
      </div>
      <p className="mt-3 text-footnote text-tertiary">
        Потяни ползунок. Слева — глянец, стекло и градиент, но глаз не находит, куда нажать. Справа
        то же самое, но с иерархией: сразу видно главное действие.
      </p>
    </div>
  );
}

function Tag({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`absolute z-[5] rounded-full border px-2.5 py-0.5 text-caption font-medium backdrop-blur-sm ${className}`}
    >
      {children}
    </span>
  );
}

/** Glossy but flat: everything competes, CTA is invisible. */
function PrettyScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 p-6">
      <div className="w-full max-w-[220px] rounded-2xl border border-white/25 bg-white/15 p-5 shadow-2xl backdrop-blur-md">
        <div className="mb-4 h-3 w-24 rounded bg-white/70" />
        <div className="mb-2 h-8 w-full rounded-lg border border-white/30 bg-white/20" />
        <div className="mb-2 h-8 w-full rounded-lg border border-white/30 bg-white/20" />
        {/* CTA identical to inputs — no dominance */}
        <div className="h-8 w-full rounded-lg border border-white/30 bg-white/20" />
        <div className="mt-3 flex justify-between">
          <div className="h-2.5 w-16 rounded bg-white/50" />
          <div className="h-2.5 w-16 rounded bg-white/50" />
        </div>
      </div>
    </div>
  );
}

/** Plain surface, clear hierarchy, one obvious CTA. */
function ClearScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-[220px] rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <div className="mb-1 h-3.5 w-28 rounded bg-neutral-800" />
        <div className="mb-4 h-2 w-20 rounded bg-neutral-300" />
        <div className="mb-2 h-8 w-full rounded-lg bg-neutral-100 ring-1 ring-neutral-200" />
        <div className="mb-3 h-8 w-full rounded-lg bg-neutral-100 ring-1 ring-neutral-200" />
        <div className="flex h-9 w-full items-center justify-center rounded-lg bg-indigo-600">
          <div className="h-2.5 w-20 rounded bg-white/90" />
        </div>
        <div className="mt-3 flex justify-center">
          <div className="h-2 w-24 rounded bg-neutral-300" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Think-then-reveal — a question the reader answers in their head
//    before the answer appears. Zero-stress, one beat of active thought.
// ─────────────────────────────────────────────────────────────

function ThinkReveal() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-canvas p-5">
      <p className="text-body font-medium text-primary">
        Куда человек посмотрит на экране первым?
      </p>
      <p className="mt-1 text-footnote text-tertiary">
        Ответь себе — а потом проверь ход мысли дизайнера.
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.button
            key="btn"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand bg-brand/10 px-4 py-2 text-footnote font-medium text-brand transition-base hover:bg-brand/15"
          >
            <Eye size={15} />
            Показать ответ
          </motion.button>
        ) : (
          <motion.div
            key="ans"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="mt-4 space-y-2 rounded-lg bg-surface p-4 text-body text-secondary"
          >
            <p>
              Не туда, где «красивее» — а туда, где{' '}
              <span className="font-medium text-primary">сильнее контраст, крупнее размер и больше воздуха вокруг</span>.
            </p>
            <p className="text-footnote text-tertiary">
              Поэтому дизайнер не «раскрашивает», а решает, что сделать доминантой, а что — приглушить.
              Внимание — это ресурс, которым он управляет.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Myth-buster chips — the "дизайн = красиво оформить" list becomes
//    clickable; each reveals why it isn't what design actually is.
// ─────────────────────────────────────────────────────────────

interface Myth {
  id: string;
  label: string;
  truth: string;
}

const MYTHS: Myth[] = [
  { id: 'font', label: 'выбрать шрифт', truth: 'Шрифт — это следствие. Сначала — какая нужна иерархия и тон, потом уже гарнитура.' },
  { id: 'pinterest', label: 'скопировать из Pinterest', truth: 'Чужой экран решал чужую задачу. Скопируешь форму — не получишь причину, по которой она работала.' },
  { id: 'color', label: 'красивый цвет', truth: 'Цвет управляет вниманием и смыслом. «Красиво» без задачи только добавляет шума.' },
  { id: 'shadow', label: 'добавить тень', truth: 'Тень — это подсказка о глубине и слоях. Как украшение она ничего не решает.' },
  { id: 'glass', label: 'сделать стекло', truth: 'Эффект стекла часто убивает контраст и читаемость — то есть работает против пользователя.' },
];

function MythBuster() {
  const [selected, setSelected] = useState<string | null>(null);
  const active = MYTHS.find((m) => m.id === selected);

  return (
    <div className="rounded-xl border border-border bg-canvas p-4">
      <p className="mb-3 text-footnote text-tertiary">
        Так думает большинство. Нажми на любой пункт — почему это ещё не дизайн:
      </p>
      <div className="flex flex-wrap gap-2">
        {MYTHS.map((m) => {
          const isActive = m.id === selected;
          return (
            <button
              key={m.id}
              onClick={() => setSelected(isActive ? null : m.id)}
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-footnote transition-base',
                isActive
                  ? 'border-rose-400/50 bg-rose-500/10 font-medium text-rose-300'
                  : 'border-border bg-surface text-secondary hover:border-rose-400/40 hover:text-primary',
              ].join(' ')}
            >
              {isActive ? <X size={13} /> : <span className="text-tertiary">×</span>}
              {m.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            className="mt-3 flex gap-3 rounded-lg bg-surface p-4 text-body text-secondary"
          >
            <Check size={18} className="mt-0.5 shrink-0 text-emerald-400" />
            <p>{active.truth}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
