'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ruler,
  Wrench,
  Blocks,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  MousePointer2,
  Frame,
  Type,
  Hand,
  Minus,
  Plus,
  AlignLeft,
  AlignCenter,
  ArrowUp,
  ListChecks,
  Waypoints,
  ArrowUpDown,
  Contrast,
  ScanSearch,
  PaintBucket,
  Move,
} from 'lucide-react';
import BlurEffect from 'react-progressive-blur';
import { Confetti } from './Confetti';
import { CrystalGem } from '@/components/achievements/CrystalGem';
import { playConfetti, playShimmer, startParticleStream, playHover, playTick, playChime } from '@/lib/sound';
import { Slider } from '@/components/ui/Slider';

const SUCCESS_RGB = '47 181 124';

/**
 * The centrepiece of the landing page: a Figma-like frame whose left "layers"
 * panel lists the platform's modes. Selecting a layer swaps the artboard. Some
 * modes are interactive — the visitor drags a slider or picks an answer, and on
 * success a crystal in the right rail lights up and confetti fires. This sells
 * the product by letting people *play* with it, not read about it.
 *
 * Every engine shown here mirrors a real task type in the app (Auto Layout
 * canvas, fix-screen, build, AI mentor, Validation Engine, plus the choose /
 * match / order exercises that make up most lessons) — a faithful teaser, not a
 * fake mock.
 */

type ModeId =
  | 'tune'
  | 'fix'
  | 'contrast'
  | 'paint'
  | 'build'
  | 'spot'
  | 'move'
  | 'quiz'
  | 'match'
  | 'order'
  | 'mentor'
  | 'validate';

interface Mode {
  id: ModeId;
  name: string;
  icon: typeof Ruler;
  kind: 'Тренажёр' | 'Практика' | 'Квиз' | 'AI' | 'Движок';
}

const MODES: Mode[] = [
  { id: 'tune', name: 'Отступы · 8pt', icon: Ruler, kind: 'Тренажёр' },
  { id: 'fix', name: 'Почини экран', icon: Wrench, kind: 'Практика' },
  { id: 'contrast', name: 'Контраст текста', icon: Contrast, kind: 'Тренажёр' },
  { id: 'paint', name: 'Заливка', icon: PaintBucket, kind: 'Тренажёр' },
  { id: 'build', name: 'Собери с нуля', icon: Blocks, kind: 'Практика' },
  { id: 'spot', name: 'Найди ошибку', icon: ScanSearch, kind: 'Практика' },
  { id: 'move', name: 'Перемести', icon: Move, kind: 'Практика' },
  { id: 'quiz', name: 'Квиз по теории', icon: ListChecks, kind: 'Квиз' },
  { id: 'match', name: 'Сопоставление', icon: Waypoints, kind: 'Практика' },
  { id: 'order', name: 'Порядок шагов', icon: ArrowUpDown, kind: 'Практика' },
  { id: 'mentor', name: 'AI-ментор', icon: Sparkles, kind: 'AI' },
  { id: 'validate', name: 'Валидация', icon: ShieldCheck, kind: 'Движок' },
];

const TOTAL = MODES.length;

export function PlatformShowcase() {
  const [active, setActive] = useState<ModeId>('tune');
  const [solved, setSolved] = useState<Record<ModeId, boolean>>(
    () => Object.fromEntries(MODES.map((m) => [m.id, false])) as Record<ModeId, boolean>,
  );
  const [fireKey, setFireKey] = useState(0);

  // Always fire confetti (so re-solving pops it again); latch the crystal once.
  function activate(id: ModeId) {
    setFireKey((k) => k + 1);
    playConfetti();
    setSolved((s) => (s[id] ? s : { ...s, [id]: true }));
  }

  // Latch the crystal without confetti — for modes where celebration would be
  // noise (e.g. sending a chat message to the mentor).
  function latch(id: ModeId) {
    setSolved((s) => (s[id] ? s : { ...s, [id]: true }));
  }

  const solvedCount = Object.values(solved).filter(Boolean).length;
  const complete = solvedCount === TOTAL;

  // Finale: the first time all five modes are solved, fire a staggered burst of
  // confetti (bigger than a single solve) and pulse the crystal — the same
  // "you-completed-everything" beat as unlocking an achievement.
  const finaleFired = useRef(false);
  useEffect(() => {
    if (!complete || finaleFired.current) return;
    finaleFired.current = true;
    const bursts = [0, 180, 360, 560].map((ms) =>
      setTimeout(() => {
        setFireKey((k) => k + 1);
        playConfetti();
      }, ms),
    );
    return () => bursts.forEach(clearTimeout);
  }, [complete]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-elevated shadow-lg">
      {/* Figma-style toolbar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-danger/70" />
          <span className="h-3 w-3 rounded-full bg-warning/70" />
          <span className="h-3 w-3 rounded-full bg-success/70" />
        </div>
        <span className="text-caption font-medium text-secondary">DesStudy — режимы платформы</span>
        <span className="ml-auto hidden text-caption text-tertiary sm:block">Открыто {solvedCount}/{TOTAL}</span>
      </div>

      <div className="grid md:grid-cols-[210px_1fr_220px]">
        {/* Layers panel */}
        <aside className="border-b border-border bg-surface px-3 py-4 md:flex md:h-[520px] md:flex-col md:overflow-hidden md:border-b-0 md:border-r">
          <p className="px-2 pb-2 text-caption uppercase tracking-wider text-tertiary">Слои</p>
          <div className="slim-scroll flex gap-1.5 overflow-x-auto md:min-h-0 md:flex-1 md:flex-col md:gap-0.5 md:overflow-x-visible md:overflow-y-auto md:pr-1">
            {MODES.map((m) => {
              const isActive = active === m.id;
              const done = solved[m.id];
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActive(m.id)}
                  onMouseEnter={() => playHover()}
                  className={[
                    'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-footnote transition-fast md:w-full',
                    isActive
                      ? 'bg-brand/10 text-primary'
                      : 'text-secondary hover:bg-hover',
                  ].join(' ')}
                >
                  <Icon size={16} className={isActive ? 'text-brand' : 'text-tertiary'} />
                  <span className="whitespace-nowrap font-medium md:whitespace-normal">{m.name}</span>
                  {done && <Check size={13} className="ml-auto hidden shrink-0 text-success md:block" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Artboard */}
        <div
          data-artboard
          className={`relative flex bg-canvas p-7 ${
            active === 'mentor'
              ? 'h-[480px] items-stretch pb-7 md:h-[520px]'
              : 'h-[480px] items-start pb-20 md:h-[520px]'
          }`}
        >
          <Confetti fireKey={fireKey} />
          {/* AI-mentor has its own message composer at the bottom — the Figma
              tool pill would only get in its way, so we hide it for that mode. */}
          {active !== 'mentor' && <CanvasToolbar />}
          {/* Keyed remount plays the enter animation per mode. No AnimatePresence
              exit here — the DS Slider inside tune stalls mode="wait" on unmount. */}
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="w-full"
          >
            {active === 'tune' && <TuneMode solved={solved.tune} onSolve={() => activate('tune')} />}
            {active === 'fix' && <FixMode solved={solved.fix} onSolve={() => activate('fix')} />}
            {active === 'contrast' && (
              <ContrastMode solved={solved.contrast} onSolve={() => activate('contrast')} />
            )}
            {active === 'paint' && <PaintMode solved={solved.paint} onSolve={() => activate('paint')} />}
            {active === 'build' && <BuildMode solved={solved.build} onSolve={() => activate('build')} />}
            {active === 'spot' && <SpotMode solved={solved.spot} onSolve={() => activate('spot')} />}
            {active === 'move' && <MoveMode solved={solved.move} onSolve={() => activate('move')} />}
            {active === 'quiz' && <QuizMode solved={solved.quiz} onSolve={() => activate('quiz')} />}
            {active === 'match' && <MatchMode solved={solved.match} onSolve={() => activate('match')} />}
            {active === 'order' && <OrderMode solved={solved.order} onSolve={() => activate('order')} />}
            {active === 'mentor' && <MentorMode solved={solved.mentor} onSolve={() => latch('mentor')} />}
            {active === 'validate' && (
              <ValidateMode solved={solved.validate} onSolve={() => activate('validate')} />
            )}
          </motion.div>
        </div>

        {/* Crystal reward rail */}
        <aside className="border-t border-border bg-surface px-4 py-4 md:border-l md:border-t-0">
          <p className="text-caption uppercase tracking-wider text-tertiary">Прогресс</p>
          <div className="mt-3 flex items-center gap-3">
            <Crystal charged={solvedCount} total={TOTAL} />
            <div>
              <motion.p
                key={solvedCount}
                initial={{ scale: complete ? 0.7 : 1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14 }}
                className={`text-title3 font-bold tabular-nums ${complete ? 'text-brand' : 'text-primary'}`}
              >
                {Math.round((solvedCount / TOTAL) * 100)}%
              </motion.p>
              <p className="text-caption text-tertiary">кристалл заряжен</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {complete ? (
              <motion.p
                key="done"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-1.5 text-caption font-medium leading-snug text-success"
              >
                <Sparkles size={14} className="shrink-0" /> Кристалл заряжен на 100% — все режимы пройдены!
              </motion.p>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-caption leading-relaxed text-secondary"
              >
                Проходи режим — активируется грань кристалла. На платформе так копится XP и растёт грейд.
              </motion.p>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}

/* ── crystal ────────────────────────────────────────────────────────── */

function Crystal({ charged, total }: { charged: number; total: number }) {
  const full = charged === total;
  // Hold the gem to hear the particles drift — a soft sustained stream that
  // fades out on release (stopStream returned by startParticleStream).
  const stopStream = useRef<(() => void) | null>(null);
  const startHold = () => {
    if (stopStream.current) return;
    stopStream.current = startParticleStream();
  };
  const endHold = () => {
    stopStream.current?.();
    stopStream.current = null;
  };
  useEffect(() => endHold, []); // clean up if unmounted mid-hold
  // Reuse the faceted achievement gem so the reward reads as beautifully here as
  // on the Achievements page. The gem charges from the bottom up as modes are
  // solved — the liquid line tracks progress — and the finale pulse fires once
  // every mode is solved.
  return (
    <motion.div
      className="relative inline-flex cursor-pointer select-none"
      onHoverStart={() => playShimmer()}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      animate={full ? { scale: [1, 1.14, 1] } : { scale: 1 }}
      transition={full ? { duration: 0.6, ease: 'easeOut' } : { duration: 0.2 }}
    >
      {/* pulsing bloom once every mode is solved */}
      {full && (
        <motion.span
          className="absolute inset-0 rounded-full bg-brand/25 blur-lg"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* gentle perpetual float — the gem hovers as if weightless */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <CrystalGem tone="sapphire" size={58} charge={charged / total} />
      </motion.div>
    </motion.div>
  );
}

/* ── shared bits ────────────────────────────────────────────────────── */

function DoneBadge() {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-caption font-medium text-success"
    >
      <Check size={12} /> готово
    </motion.span>
  );
}

function ModeHeader({ title, hint, done }: { title: string; hint: string; done: boolean }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <p className="text-footnote font-semibold text-primary">{title}</p>
        <p className="text-caption text-tertiary">{hint}</p>
      </div>
      {done && <DoneBadge />}
    </div>
  );
}

/* ── mode: tune spacing ─────────────────────────────────────────────── */

function TuneMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [gap, setGap] = useState(6);
  const [padding, setPadding] = useState(12);

  // Valid answers: multiples of 8 within a sensible range — 8, 16, 24.
  // 32 / 40 count as too much, so they stay "wrong".
  const onGrid = (v: number) => v >= 8 && v <= 24 && v % 8 === 0;
  const gapOk = onGrid(gap);
  const padOk = onGrid(padding);
  const allOk = gapOk && padOk;

  const isOk = (g: number, p: number) => onGrid(g) && onGrid(p);

  function bump(kind: 'gap' | 'pad', v: number) {
    const wasOk = isOk(gap, padding);
    const nextGap = kind === 'gap' ? v : gap;
    const nextPad = kind === 'pad' ? v : padding;
    if (kind === 'gap') setGap(v);
    else setPadding(v);
    // Fire on every rising edge into "all valid" — re-solving pops confetti again.
    if (isOk(nextGap, nextPad) && !wasOk) onSolve();
  }

  return (
    <div className="flex min-h-[360px] flex-col">
      <ModeHeader title="Тренажёр отступов" hint="Сделай gap и padding кратными 8pt" done={solved} />

      {/* Selected frame with live Figma-style measurements. The wrapper reserves a
          fixed height and centres the frame, so growing padding/gap resizes the
          frame in place instead of shifting everything below (and re-centring the
          whole artboard) on every click. */}
      <div className="relative flex h-[128px] items-center">
        <div
          className={`relative w-full rounded-xl border-2 bg-surface transition-base ${
            allOk ? 'border-success' : 'border-brand'
          }`}
          style={{ padding }}
        >
          {/* corner handles */}
          {[
            'left-[-4px] top-[-4px]',
            'right-[-4px] top-[-4px]',
            'left-[-4px] bottom-[-4px]',
            'right-[-4px] bottom-[-4px]',
          ].map((pos) => (
            <span
              key={pos}
              className={`absolute h-2 w-2 rounded-[2px] border bg-surface ${
                allOk ? 'border-success' : 'border-brand'
              } ${pos}`}
            />
          ))}

          {/* padding label — pinned to the frame so it tracks the frame's edge */}
          <span
            className={`absolute right-2 top-2 rounded-[3px] px-1 text-[10px] font-semibold tabular-nums transition-base ${
              padOk ? 'bg-success/15 text-success' : 'bg-brand/10 text-brand'
            }`}
          >
            padding {padding}
          </span>

          <div className="relative flex items-center" style={{ gap }}>
            <div className="h-11 w-11 shrink-0 rounded-xl bg-brand/15" />
            {/* gap measurement chip — overlaid so it never adds width;
               the visible spacing equals the real gap (0 = truly flush) */}
            {gap > 0 && (
              <span
                className={`pointer-events-none absolute top-1/2 z-10 flex min-w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums text-on-brand transition-base ${
                  gapOk ? 'bg-success' : 'bg-brand'
                }`}
                style={{ height: 14, left: `calc(2.75rem + ${gap / 2}px)` }}
              >
                {gap}
              </span>
            )}
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-2.5 w-full rounded-full bg-border-strong" />
              <div className="h-2.5 w-3/4 rounded-full bg-border" />
            </div>
          </div>
        </div>
      </div>

      {/* gap slider — design-system Slider (recolors green + celebrates on success) */}
      <div className="mt-auto pt-7">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-caption text-tertiary">gap</span>
          <span
            className={`min-w-[46px] text-right text-footnote font-semibold tabular-nums ${gapOk ? 'text-success' : 'text-primary'}`}
          >
            {gap}px
          </span>
        </div>
        <Slider
          value={gap}
          min={0}
          max={24}
          step={2}
          unit="px"
          accent={gapOk ? SUCCESS_RGB : undefined}
          celebrate={allOk}
          onChange={(v) => bump('gap', v)}
        />
      </div>

      {/* padding slider — same control as gap so the two identical-type tasks
          read identically (was a +/- stepper, which looked inconsistent). */}
      <div className="mt-6">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-caption text-tertiary">padding</span>
          <span
            className={`min-w-[46px] text-right text-footnote font-semibold tabular-nums ${padOk ? 'text-success' : 'text-primary'}`}
          >
            {padding}px
          </span>
        </div>
        <Slider
          value={padding}
          min={0}
          max={24}
          step={2}
          unit="px"
          accent={padOk ? SUCCESS_RGB : undefined}
          celebrate={allOk}
          onChange={(v) => bump('pad', v)}
        />
      </div>

      {/* two validation lines */}
      <div className="mt-4 space-y-1.5">
        <ValLine ok={gapOk} label="gap кратен 8" />
        <ValLine ok={padOk} label="padding кратен 8" />
      </div>
    </div>
  );
}

function StepBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-secondary transition-fast hover:bg-hover active:bg-pressed"
    >
      {children}
    </button>
  );
}

function ValLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-caption">
      {/* fixed 14px icon slot so the label doesn't shift when ok toggles */}
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {ok ? (
          <Check size={13} className="text-success" />
        ) : (
          <span className="h-3 w-3 rounded-full border border-border-strong" />
        )}
      </span>
      <span className={ok ? 'text-success' : 'text-tertiary'}>
        {label}
        {ok && ' — пройдено'}
      </span>
    </div>
  );
}

/* ── canvas toolbar (Figma-like tool pill) ──────────────────────────── */

const TOOLS = [
  { icon: MousePointer2, label: 'Выделение' },
  { icon: Hand, label: 'Рука' },
  { icon: Frame, label: 'Фрейм' },
  { icon: Type, label: 'Текст' },
];

function CanvasToolbar() {
  const [active, setActive] = useState(0);
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-elevated px-1.5 py-1 shadow-md">
      {TOOLS.map((t, i) => {
        const Icon = t.icon;
        const isActive = active === i;
        return (
          <button
            key={t.label}
            type="button"
            aria-label={t.label}
            onClick={() => setActive(i)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-fast ${
              isActive ? 'bg-brand text-on-brand' : 'text-secondary hover:bg-hover'
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}

/* small segmented control shared by fix/build modes */
function Seg<T extends string>({
  options,
  value,
  onPick,
}: {
  options: { id: T; label: React.ReactNode }[];
  value: T | null;
  onPick: (id: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface p-0.5">
      {options.map((o) => {
        const isActive = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption font-medium transition-fast ${
              isActive ? 'bg-brand text-on-brand' : 'text-secondary hover:bg-hover'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── mode: fix screen — 2 fixes: contrast + tap-target ───────────────── */

function FixMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [textColor, setTextColor] = useState<'light' | 'white' | null>(solved ? 'white' : null);
  const [btnH, setBtnH] = useState(solved ? 48 : 30);

  const contrastOk = textColor === 'white';
  const tapOk = btnH >= 44;
  const isOk = (c: typeof textColor, h: number) => c === 'white' && h >= 44;

  function pickColor(c: 'light' | 'white') {
    const was = isOk(textColor, btnH);
    setTextColor(c);
    if (isOk(c, btnH) && !was) onSolve();
  }
  function setH(h: number) {
    const was = isOk(textColor, btnH);
    setBtnH(h);
    if (isOk(textColor, h) && !was) onSolve();
  }

  return (
    <div className="flex min-h-[340px] flex-col">
      <ModeHeader title="Почини экран" hint="Две проблемы: контраст текста и размер кнопки" done={solved} />

      {/* live preview */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 space-y-1.5">
          <div className="h-2.5 w-2/3 rounded bg-border-strong" />
          <div className="h-2.5 w-1/2 rounded bg-border" />
        </div>
        <div
          className="flex items-center justify-center rounded-lg bg-brand text-footnote font-medium transition-base"
          style={{ color: textColor === 'white' ? '#ffffff' : '#8b93de', height: btnH }}
        >
          Купить курс
        </div>
      </div>

      {/* action 1 — pick text color */}
      <div className="mt-auto flex items-center gap-3 pt-4">
        <span className="w-28 shrink-0 text-caption text-tertiary">цвет текста</span>
        <Seg
          value={textColor}
          onPick={pickColor}
          options={[
            { id: 'light', label: 'Светло-синий' },
            { id: 'white', label: 'Белый' },
          ]}
        />
      </div>

      {/* action 2 — grow the button to a valid tap target */}
      <div className="mt-3 flex items-center gap-3">
        <span className="w-28 shrink-0 text-caption text-tertiary">высота кнопки</span>
        <div className="flex flex-1 items-center gap-2">
          <StepBtn label="убавить высоту" onClick={() => setH(Math.max(24, btnH - 4))}>
            <Minus size={14} />
          </StepBtn>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-base ${tapOk ? 'bg-success' : 'bg-brand'}`}
              style={{ width: `${((btnH - 24) / (56 - 24)) * 100}%` }}
            />
          </div>
          <StepBtn label="прибавить высоту" onClick={() => setH(Math.min(56, btnH + 4))}>
            <Plus size={14} />
          </StepBtn>
        </div>
        <span
          className={`min-w-[46px] text-right text-footnote font-semibold tabular-nums ${
            tapOk ? 'text-success' : 'text-primary'
          }`}
        >
          {btnH}px
        </span>
      </div>

      {/* validation */}
      <div className="mt-4 space-y-1.5">
        <ValLine ok={contrastOk} label="Контраст текста AA (8.6:1)" />
        <ValLine ok={tapOk} label="Тач-таргет ≥ 44px" />
      </div>
    </div>
  );
}

/* ── mode: build — assemble hierarchy: size + alignment ──────────────── */

function BuildMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [size, setSize] = useState<'s' | 'm' | 'l' | null>(solved ? 'l' : null);
  const [align, setAlign] = useState<'left' | 'center' | null>(solved ? 'left' : null);

  const sizeOk = size === 'l';
  const alignOk = align === 'left';
  const isOk = (s: typeof size, a: typeof align) => s === 'l' && a === 'left';

  function pickSize(s: 's' | 'm' | 'l') {
    const was = isOk(size, align);
    setSize(s);
    if (isOk(s, align) && !was) onSolve();
  }
  function pickAlign(a: 'left' | 'center') {
    const was = isOk(size, align);
    setAlign(a);
    if (isOk(size, a) && !was) onSolve();
  }

  const headH = size === 'l' ? 18 : size === 'm' ? 12 : 8;

  return (
    <div>
      <ModeHeader title="Собери с нуля" hint="Собери карточку: задай размер заголовка и выравнивание" done={solved} />

      {/* live preview */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div
          className={`flex flex-col gap-2 ${
            align === 'left' ? 'items-start' : align === 'center' ? 'items-center' : 'items-end'
          }`}
        >
          {/* fixed 18px slot so the taller heading (size L) never grows the card */}
          <div className="flex h-[18px] items-center" style={{ width: '70%' }}>
            <div className="w-full rounded-full bg-border-strong transition-base" style={{ height: headH }} />
          </div>
          <div className="h-2 w-full rounded-full bg-border" />
          <div className="h-2 w-2/3 rounded-full bg-border" />
        </div>
      </div>

      {/* action 1 — heading size */}
      <div className="mt-4 flex items-center gap-3">
        <span className="w-28 shrink-0 text-caption text-tertiary">заголовок</span>
        <Seg
          value={size}
          onPick={pickSize}
          options={[
            { id: 's', label: 'S' },
            { id: 'm', label: 'M' },
            { id: 'l', label: 'L' },
          ]}
        />
      </div>

      {/* action 2 — alignment */}
      <div className="mt-3 flex items-center gap-3">
        <span className="w-28 shrink-0 text-caption text-tertiary">выравнивание</span>
        <Seg
          value={align}
          onPick={pickAlign}
          options={[
            { id: 'left', label: <AlignLeft size={15} /> },
            { id: 'center', label: <AlignCenter size={15} /> },
          ]}
        />
      </div>

      {/* validation */}
      <div className="mt-4 space-y-1.5">
        <ValLine ok={sizeOk} label="Заголовок доминирует (размер L)" />
        <ValLine ok={alignOk} label="Контент выровнен по левому краю" />
      </div>
    </div>
  );
}

/* ── mode: contrast — drag text lightness to a passing WCAG ratio ────── */

// Relative luminance of a neutral gray channel (0–255), per WCAG 2.1.
function grayLuminance(c: number) {
  const s = c / 255;
  const lin = s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  return lin;
}
// Contrast ratio of a gray on a white background.
function contrastOnWhite(gray: number) {
  return (1 + 0.05) / (grayLuminance(gray) + 0.05);
}

function ContrastMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  // `dark` = how dark the text is (0 = near-white, 100 = black). Start light so
  // the sample fails, and the visitor drags until it passes AA.
  const [dark, setDark] = useState(solved ? 80 : 20);

  const gray = Math.round(255 - (dark / 100) * 255);
  const ratio = contrastOnWhite(gray);
  const aaOk = ratio >= 4.5; // WCAG AA for normal text
  const wasOk = useRef(solved);

  function setLevel(v: number) {
    setDark(v);
    const nowOk = contrastOnWhite(Math.round(255 - (v / 100) * 255)) >= 4.5;
    if (nowOk && !wasOk.current) onSolve();
    wasOk.current = nowOk;
  }

  const textColor = `rgb(${gray} ${gray} ${gray})`;

  return (
    <div className="flex min-h-[340px] flex-col">
      <ModeHeader title="Контраст текста" hint="Затемняй текст, пока контраст не пройдёт AA (≥ 4.5:1)" done={solved} />

      {/* live preview on a white card */}
      <div className="rounded-xl border border-border bg-white p-5">
        <p className="text-footnote font-semibold transition-base" style={{ color: textColor }}>
          Заголовок курса
        </p>
        <p className="mt-1 text-caption leading-snug transition-base" style={{ color: textColor }}>
          Этот абзац должен читаться без напряжения на белом фоне.
        </p>
      </div>

      {/* live ratio read-out */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-caption text-tertiary">контраст с фоном</span>
        <span
          className={`rounded-md px-2 py-0.5 text-footnote font-semibold tabular-nums transition-base ${
            aaOk ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
          }`}
        >
          {ratio.toFixed(1)}:1
        </span>
      </div>

      {/* darkness slider — recolors green + celebrates on pass */}
      <div className="mt-auto pt-6">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-caption text-tertiary">насыщенность текста</span>
        </div>
        <Slider
          value={dark}
          min={0}
          max={100}
          step={5}
          accent={aaOk ? SUCCESS_RGB : undefined}
          celebrate={aaOk}
          onChange={setLevel}
        />
      </div>

      {/* validation */}
      <div className="mt-4 space-y-1.5">
        <ValLine ok={aaOk} label="Контраст ≥ 4.5:1 (WCAG AA)" />
      </div>
    </div>
  );
}

/* ── mode: spot — find the block that breaks the grid (click-to-fix) ──── */

const SPOT_TILES = [0, 1, 2, 3];
const SPOT_ODD = 2; // this tile sits off the baseline

function SpotMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [fixedOdd, setFixedOdd] = useState(solved);
  const [miss, setMiss] = useState<number | null>(null);

  function tap(i: number) {
    if (fixedOdd) return;
    if (i === SPOT_ODD) {
      setFixedOdd(true);
      setMiss(null);
      onSolve();
    } else {
      setMiss(i);
      setTimeout(() => setMiss((m) => (m === i ? null : m)), 450);
    }
  }

  return (
    <div className="flex min-h-[340px] flex-col">
      <ModeHeader
        title="Найди ошибку"
        hint="Один блок выбивается из сетки — кликни по нему, чтобы выровнять"
        done={solved}
      />

      {/* live board — four tiles on a shared baseline; one is nudged up */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-end gap-3">
          {SPOT_TILES.map((i) => {
            const odd = i === SPOT_ODD && !fixedOdd;
            const shake = miss === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                aria-label={`Блок ${i + 1}`}
                style={{ transform: odd ? 'translateY(-14px)' : 'translateY(0)' }}
                className={[
                  'flex flex-1 flex-col gap-2 rounded-lg border p-3 text-left transition-base',
                  fixedOdd
                    ? 'cursor-default border-border bg-canvas'
                    : 'cursor-pointer hover:border-brand',
                  odd
                    ? 'border-brand/60 bg-brand/5'
                    : 'border-border bg-canvas',
                  shake ? 'border-danger bg-danger/10' : '',
                ].join(' ')}
              >
                <span className="h-8 w-8 rounded-lg bg-brand/15" />
                <span className="h-2 w-full rounded-full bg-border-strong" />
                <span className="h-2 w-2/3 rounded-full bg-border" />
              </button>
            );
          })}
        </div>
      </div>

      <p className={`mt-auto pt-4 text-caption ${fixedOdd ? 'text-success' : 'text-tertiary'}`}>
        {fixedOdd
          ? '✓ Ровная базовая линия — глаз считывает ряд как единое целое'
          : miss !== null
            ? 'Этот блок на месте. Ищи тот, что приподнят над линией'
            : 'Три блока стоят на одной линии, один — нет. Кликни по нарушителю'}
      </p>

      <div className="mt-4 space-y-1.5">
        <ValLine ok={fixedOdd} label="Все блоки на одной базовой линии" />
      </div>
    </div>
  );
}

/* ── mode: paint — fill the shape with the right design token ────────── */

const SWATCHES = [
  { id: 'brand', token: 'brand-500', css: 'var(--brand)', ok: true },
  { id: 'red', token: 'red-500', css: '#e5484d', ok: false },
  { id: 'green', token: 'green-500', css: '#2fb57c', ok: false },
  { id: 'gray', token: 'gray-400', css: '#9ca3af', ok: false },
  { id: 'amber', token: 'amber-500', css: '#f5a623', ok: false },
] as const;

function PaintMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [fill, setFill] = useState<string | null>(solved ? 'brand' : null);
  const picked = SWATCHES.find((s) => s.id === fill) ?? null;
  const ok = picked?.ok ?? false;

  function paint(id: string) {
    if (ok) return; // lock once correct
    setFill(id);
    if (SWATCHES.find((s) => s.id === id)?.ok) onSolve();
  }

  return (
    <div className="flex min-h-[340px] flex-col">
      <ModeHeader
        title="Заливка"
        hint="Покрась кнопку в акцентный токен бренда — как заливкой в Figma"
        done={solved}
      />

      {/* live preview — the shape whose fill you're painting */}
      <div className="flex items-center justify-center rounded-xl border border-border bg-surface p-6">
        <div
          className="flex h-11 items-center justify-center rounded-xl px-6 text-footnote font-medium transition-base"
          style={{
            background: picked ? picked.css : 'var(--bg-muted)',
            color: picked ? '#ffffff' : 'var(--text-tertiary)',
          }}
        >
          Начать курс
        </div>
      </div>

      {/* fill token row — the Figma-style swatch picker */}
      <div className="mt-auto pt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-caption text-tertiary">Fill</span>
          <span className="font-mono text-caption text-secondary">
            {picked ? picked.token : '—'}
          </span>
        </div>
        <div className="flex gap-2.5">
          {SWATCHES.map((s) => {
            const isPicked = fill === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={s.token}
                onClick={() => paint(s.id)}
                className={[
                  'h-9 w-9 shrink-0 rounded-lg border transition-fast',
                  isPicked ? 'ring-2 ring-brand ring-offset-2 ring-offset-canvas' : 'hover:scale-105',
                  isPicked ? 'border-transparent' : 'border-black/10',
                ].join(' ')}
                style={{ background: s.css }}
              />
            );
          })}
        </div>
      </div>

      {/* validation */}
      <div className="mt-5 space-y-1.5">
        <ValLine ok={ok} label="Заливка = акцентный токен (brand-500)" />
      </div>
    </div>
  );
}

/* ── mode: move — drag the block into the frame, snaps on release ─────── */

function MoveMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const boardRef = useRef<HTMLDivElement>(null);
  // Position of the draggable block's top-left, in board px.
  const START = { x: 12, y: 44 };
  const TARGET = { x: 176, y: 30 };
  const BLOCK = { w: 84, h: 60 };
  const SNAP = 26; // px tolerance between block+target centres

  const [pos, setPos] = useState(solved ? TARGET : START);
  const [dragging, setDragging] = useState(false);
  const [snapped, setSnapped] = useState(solved);
  const grab = useRef({ dx: 0, dy: 0 });

  function centreDist(p: { x: number; y: number }) {
    return Math.hypot(p.x - TARGET.x, p.y - TARGET.y);
  }
  const near = !snapped && dragging && centreDist(pos) < SNAP;

  function onDown(e: React.PointerEvent) {
    if (snapped) return;
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    grab.current = { dx: e.clientX - b.left - pos.x, dy: e.clientY - b.top - pos.y };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging) return;
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const x = Math.max(0, Math.min(b.width - BLOCK.w, e.clientX - b.left - grab.current.dx));
    const y = Math.max(0, Math.min(b.height - BLOCK.h, e.clientY - b.top - grab.current.dy));
    setPos({ x, y });
  }
  function onUp(e: React.PointerEvent) {
    if (!dragging) return;
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (centreDist(pos) < SNAP) {
      setPos(TARGET);
      setSnapped(true);
      onSolve();
    }
  }

  return (
    <div className="flex min-h-[340px] flex-col">
      <ModeHeader
        title="Перемести"
        hint="Перетащи блок в пунктирную рамку — он примагнитится, как в Figma"
        done={solved}
      />

      <div
        ref={boardRef}
        className="relative h-[150px] w-full overflow-hidden rounded-xl border border-border bg-surface"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* drop frame */}
        <div
          className={`absolute rounded-lg border-2 border-dashed transition-base ${
            snapped ? 'border-success/60 bg-success/5' : near ? 'border-brand bg-brand/10' : 'border-border-strong'
          }`}
          style={{ left: TARGET.x, top: TARGET.y, width: BLOCK.w, height: BLOCK.h }}
        />

        {/* draggable block */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          role="button"
          aria-label="Перетаскиваемый блок"
          className={[
            'absolute flex flex-col justify-center gap-1.5 rounded-lg border px-3 shadow-sm transition-shadow select-none touch-none',
            snapped
              ? 'cursor-default border-success bg-success/10'
              : dragging
                ? 'cursor-grabbing border-brand bg-elevated shadow-md'
                : 'cursor-grab border-border bg-elevated',
          ].join(' ')}
          style={{
            left: pos.x,
            top: pos.y,
            width: BLOCK.w,
            height: BLOCK.h,
            transition: dragging ? 'none' : 'left 0.28s cubic-bezier(0.32,1.12,0.5,1), top 0.28s cubic-bezier(0.32,1.12,0.5,1)',
          }}
        >
          <span className="h-6 w-6 rounded-md bg-brand/20" />
          <span className="h-1.5 w-full rounded-full bg-border-strong" />
        </div>
      </div>

      <p className={`mt-auto pt-4 text-caption ${snapped ? 'text-success' : 'text-tertiary'}`}>
        {snapped
          ? '✓ Блок на месте — привязка к рамке сработала'
          : 'Тащи карточку к пунктирному контуру, пока он не подсветится, и отпусти'}
      </p>

      <div className="mt-4 space-y-1.5">
        <ValLine ok={snapped} label="Блок привязан к целевой рамке" />
      </div>
    </div>
  );
}

/* ── mode: quiz — single-choice theory question (`choose`) ───────────── */

const QUIZ = {
  question: 'Пользователь не замечает главную кнопку на экране. Что вероятнее поможет?',
  options: [
    { id: 'a', label: 'Усилить контраст и размер только у акцентной кнопки', ok: true },
    { id: 'b', label: 'Добавить рядом ещё несколько кнопок', ok: false },
    { id: 'c', label: 'Покрасить все кнопки в один яркий цвет', ok: false },
  ],
} as const;

function QuizMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [picked, setPicked] = useState<string | null>(solved ? 'a' : null);
  const answered = picked !== null;

  function pick(id: string) {
    if (picked && QUIZ.options.find((o) => o.id === picked)?.ok) return; // lock once correct
    setPicked(id);
    if (QUIZ.options.find((o) => o.id === id)?.ok) onSolve();
  }

  return (
    <div>
      <ModeHeader title="Квиз по теории" hint="Выбери верный ответ — как в уроках" done={solved} />

      <p className="rounded-xl border border-border bg-surface p-4 text-footnote text-primary">
        {QUIZ.question}
      </p>

      <div className="mt-3 space-y-2">
        {QUIZ.options.map((o) => {
          const isPicked = picked === o.id;
          const showState = isPicked;
          const good = isPicked && o.ok;
          const bad = isPicked && !o.ok;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => pick(o.id)}
              className={[
                'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-footnote transition-base',
                good
                  ? 'border-success bg-success/10 text-primary'
                  : bad
                    ? 'border-danger bg-danger/10 text-primary'
                    : 'border-border bg-surface text-secondary hover:bg-hover',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  good ? 'border-success bg-success text-on-brand' : bad ? 'border-danger bg-danger text-on-brand' : 'border-border-strong',
                ].join(' ')}
              >
                {good && <Check size={13} />}
                {bad && <X size={13} />}
              </span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>

      {/* reserved slot (fits the 2-line feedback) so revealing it never nudges the card */}
      <div className="mt-3 min-h-[40px]">
        {answered && (
          <p className={`text-caption ${QUIZ.options.find((o) => o.id === picked)?.ok ? 'text-success' : 'text-tertiary'}`}>
            {QUIZ.options.find((o) => o.id === picked)?.ok
              ? '✓ Верно — одна доминанта считывается быстрее, чем много равных акцентов'
              : 'Почти — один явный акцент заметнее, чем несколько конкурирующих. Попробуй ещё'}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── mode: match — pair term ↔ value (`match`) ───────────────────────── */

const PAIRS = [
  { id: 'space', term: 'space-200', value: '8px' },
  { id: 'font', term: 'font-size-body', value: '16px' },
  { id: 'color', term: 'color-fg-muted', value: 'приглушённый серый' },
  { id: 'radius', term: 'radius-lg', value: '12px' },
  { id: 'weight', term: 'font-weight-bold', value: '700' },
];

function MatchMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [pickedTerm, setPickedTerm] = useState<string | null>(null);
  const [linked, setLinked] = useState<Set<string>>(() => new Set(solved ? PAIRS.map((p) => p.id) : []));
  const [wrong, setWrong] = useState<string | null>(null);

  // Stable shuffled value column (values must not sit next to their term).
  const values = useRef([...PAIRS].reverse()).current;

  function tapTerm(id: string) {
    if (linked.has(id)) return;
    setPickedTerm((cur) => (cur === id ? null : id));
    setWrong(null);
  }

  function tapValue(valueId: string) {
    if (!pickedTerm || linked.has(valueId)) return;
    if (pickedTerm === valueId) {
      const next = new Set(linked).add(valueId);
      setLinked(next);
      setPickedTerm(null);
      if (next.size === PAIRS.length) onSolve();
    } else {
      setWrong(valueId);
      setTimeout(() => setWrong((w) => (w === valueId ? null : w)), 450);
    }
  }

  return (
    <div>
      <ModeHeader title="Сопоставление" hint="Соедини токен с его значением — тапни слева, затем справа" done={solved} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {PAIRS.map((p) => {
            const done = linked.has(p.id);
            const isPicked = pickedTerm === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => tapTerm(p.id)}
                disabled={done}
                className={[
                  'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left font-mono text-caption transition-base',
                  done
                    ? 'border-success bg-success/10 text-success'
                    : isPicked
                      ? 'border-brand bg-brand/10 text-primary ring-1 ring-brand'
                      : 'border-border bg-surface text-secondary hover:bg-hover',
                ].join(' ')}
              >
                {done && <Check size={13} className="shrink-0" />}
                {p.term}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {values.map((p) => {
            const done = linked.has(p.id);
            const isWrong = wrong === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => tapValue(p.id)}
                disabled={done}
                className={[
                  'flex w-full items-center justify-end gap-2 rounded-xl border px-3 py-2.5 text-right text-caption transition-base',
                  done
                    ? 'border-success bg-success/10 text-success'
                    : isWrong
                      ? 'border-danger bg-danger/10 text-primary'
                      : 'border-border bg-surface text-secondary hover:bg-hover',
                ].join(' ')}
              >
                {p.value}
                {done && <Check size={13} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-caption text-tertiary">
        Соединено {linked.size} из {PAIRS.length}
        {linked.size === PAIRS.length && <span className="text-success"> — все пары верны</span>}
      </p>
    </div>
  );
}

/* ── mode: order — arrange the design-process steps (`order`) ────────── */

const ORDER_STEPS = [
  { id: 's1', label: 'Эмпатия — понять пользователя' },
  { id: 's2', label: 'Фокус — сформулировать проблему' },
  { id: 's3', label: 'Идеи — накидать варианты' },
  { id: 's4', label: 'Прототип — собрать решение' },
];
const CORRECT_ORDER = ORDER_STEPS.map((s) => s.id);

function OrderMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  // Start shuffled (swap first two) unless already solved.
  const [items, setItems] = useState(() =>
    solved ? ORDER_STEPS : [ORDER_STEPS[1], ORDER_STEPS[0], ORDER_STEPS[3], ORDER_STEPS[2]],
  );

  const ordered = items.map((i) => i.id).join() === CORRECT_ORDER.join();
  const wasOk = useRef(solved);
  const [dragId, setDragId] = useState<string | null>(null);

  function commit(next: typeof items) {
    setItems(next);
    const nowOk = next.map((i) => i.id).join() === CORRECT_ORDER.join();
    if (nowOk && !wasOk.current) onSolve();
    wasOk.current = nowOk;
  }

  // Live reorder: as the dragged card enters another, that card yields its slot.
  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const from = items.findIndex((i) => i.id === fromId);
    const to = items.findIndex((i) => i.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  }

  return (
    <div>
      <ModeHeader title="Порядок шагов" hint="Расставь этапы дизайн-процесса по порядку" done={solved} />

      <div className="space-y-2">
        {items.map((item, i) => {
          const dragging = dragId === item.id;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => {
                setDragId(item.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnter={() => {
                if (dragId) reorder(dragId, item.id);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setDragId(null);
              }}
              onDragEnd={() => setDragId(null)}
              className={[
                'flex cursor-grab items-center gap-3 rounded-xl border px-3 py-2.5 transition-base active:cursor-grabbing select-none',
                ordered ? 'border-success bg-success/10' : 'border-border bg-surface',
                dragging ? 'opacity-50 ring-2 ring-brand/40' : '',
              ].join(' ')}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-caption font-semibold tabular-nums ${
                  ordered ? 'bg-success text-on-brand' : 'bg-brand/10 text-brand'
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-footnote text-primary">{item.label}</span>
            </div>
          );
        })}
      </div>

      <p className={`mt-3 text-caption ${ordered ? 'text-success' : 'text-tertiary'}`}>
        {ordered ? '✓ Верный порядок — от исследования к решению' : 'Перетаскивай карточки, меняя их местами до верной последовательности'}
      </p>
    </div>
  );
}

/* ── mode: AI mentor — pick a question, get coached ──────────────────── */

const MENTOR_QA = [
  {
    q: 'Почему экран выглядит неаккуратно?',
    a: 'Отступы между блоками все разные. Какое одно значение сделало бы ритм ровным? Не подскажу число — попробуй 8, 16, 24.',
  },
  {
    q: 'Как выбрать размеры шрифтов?',
    a: 'Начни с одного шага контраста: заголовок должен явно «спорить» с текстом. Во сколько раз он крупнее сейчас — и достаточно ли это?',
  },
  {
    q: 'Макет ощущается пустым — что делать?',
    a: 'Пустоту лечит не заполнение, а группировка. Что здесь можно объединить в один блок, чтобы появился центр внимания?',
  },
];

interface ChatMsg {
  id: string;
  role: 'me' | 'ai';
  text: string;
}

/** Coach reply: match a known question, else a generic guiding question. Never
 * hands over the answer — always nudges the student to think (coach, not solver). */
function coachReply(q: string): string {
  const t = q.toLowerCase();
  const hit = MENTOR_QA.find((x) => {
    const words = x.q.toLowerCase().replace(/[?«».,]/g, '').split(' ').filter((w) => w.length > 4);
    return words.some((w) => t.includes(w));
  });
  return (
    hit?.a ??
    'Хороший вопрос. Прежде чем подсказать — что ты уже пробовал и какой результат смущает сильнее всего? Давай начнём оттуда.'
  );
}

let chatSeq = 0;

/** Teaser guardrails — the landing mentor is a demo, not a free AI chat.
 * The preset chip questions ship with canned answers (no model call at all);
 * only a custom typed message hits the model, and both are capped. */
const MENTOR_MAX_MSGS = 5;
const MENTOR_MAX_CHARS = 200;

/**
 * Flying "tablet" of a sent message (ported from teachstream CHAT_SEND_ANIMATION.md
 * §5): the bubble is drawn AT its final slot (`to`); a starting transform offsets
 * it back to the input, then it flies onto its slot with a soft spring bounce.
 * The real bubble underneath is hidden (opacity 0) and revealed in one commit at
 * onDone — no crossfade, so the translucent brand fill never doubles up.
 */
function FlyingSendBubble({
  from,
  to,
  text,
  container,
  onDone,
}: {
  from: DOMRect;
  to: DOMRect;
  text: string;
  /** Positioned ancestor to portal into — its overflow-hidden clips the clone,
   * so the fixed-position variant can't spawn a page-level horizontal scrollbar. */
  container: HTMLElement;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const cRect = container.getBoundingClientRect();

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof window === 'undefined') {
      doneRef.current();
      return;
    }
    const dx = from.left - to.left;
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const anim = node.animate(
      [
        { offset: 0, transform: `translate(${dx}px, ${dy}px) scale(0.86)`, opacity: 0.5, filter: 'blur(1.4px)', boxShadow: '0 18px 30px -8px rgba(79,70,229,0.45)' },
        { offset: 0.5, transform: `translate(${dx * 0.1}px, ${dy * 0.1}px) scale(0.99)`, opacity: 1, filter: 'blur(0px)', boxShadow: '0 10px 20px -8px rgba(79,70,229,0.35)' },
        { offset: 0.72, transform: 'translate(0px,-3px) scale(1.065)', opacity: 1, filter: 'blur(0px)', boxShadow: '0 6px 14px -6px rgba(79,70,229,0.28)' },
        { offset: 0.87, transform: 'translate(0px,1px) scale(0.99)', opacity: 1, filter: 'blur(0px)', boxShadow: '0 2px 6px -4px rgba(79,70,229,0.18)' },
        { offset: 1, transform: 'translate(0px,0px) scale(1)', opacity: 1, filter: 'blur(0px)', boxShadow: '0 0 0 0 rgba(79,70,229,0)' },
      ],
      { duration: 560, easing: 'cubic-bezier(0.33,0.9,0.4,1)', fill: 'backwards' },
    );
    anim.onfinish = () => doneRef.current();
    anim.oncancel = () => doneRef.current();
    return () => {
      anim.onfinish = null;
      anim.oncancel = null;
    };
  }, [from, to, text]);

  return createPortal(
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute z-[96] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-left text-caption leading-snug text-on-brand"
      style={{
        left: to.left - cRect.left,
        top: to.top - cRect.top,
        width: to.width,
        transformOrigin: 'right center',
        willChange: 'transform, opacity, filter',
      }}
    >
      {text}
    </div>,
    container,
  );
}

/**
 * Progressive blur at a scroll edge — a stack of increasing `backdrop-blur`
 * (via react-progressive-blur) so content dissolves under the floating header
 * (top) and composer (bottom). Pass `fill` to also lay a strong linear fill in
 * the canvas colour over the blur, so content melts fully into the edge (used
 * at the bottom, where messages sink into the composer).
 */
function MentorProgressiveBlur({
  edge,
  height = 72,
  fill = false,
  active = true,
}: {
  edge: 'top' | 'bottom';
  height?: number;
  fill?: boolean;
  /** When false the fade eases out instead of unmounting — no hard pop as the
   * scroll reaches an edge. Always kept mounted so opacity can transition. */
  active?: boolean;
}) {
  const fadeDir = edge === 'top' ? 'to bottom' : 'to top';
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 z-10 transition-opacity duration-300 ${
        edge === 'top' ? 'top-0' : 'bottom-0'
      } ${active ? 'opacity-100' : 'opacity-0'}`}
      style={{ height }}
    >
      <BlurEffect position={edge} intensity={70} className="!h-full [pointer-events:none!important]" />
      {fill && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${fadeDir}, var(--bg-canvas) 0%, var(--bg-canvas) 45%, color-mix(in srgb, var(--bg-canvas) 55%, transparent) 72%, transparent 100%)`,
          }}
        />
      )}
    </div>
  );
}

function MentorMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<ChatMsg[]>(
    solved
      ? [
          { id: 'seed-q', role: 'me', text: MENTOR_QA[0].q },
          { id: 'seed-a', role: 'ai', text: MENTOR_QA[0].a },
        ]
      : [],
  );
  const [typing, setTyping] = useState(false);
  const [sendFly, setSendFly] = useState<{
    from: DOMRect;
    to: DOMRect;
    text: string;
    id: string;
    container: HTMLElement;
  } | null>(null);
  const [hideId, setHideId] = useState<string | null>(null);
  // Which edges have off-screen content — the fade only makes sense when the log
  // actually overflows, otherwise the blur just smears a fully-visible message.
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ id: string; text: string; from: DOMRect; prevTops: Map<string, number> } | null>(null);

  function updateEdges() {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 4;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
    setEdges((cur) => (cur.top === top && cur.bottom === bottom ? cur : { top, bottom }));
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    updateEdges();
  }, [msgs, typing]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Launch the FLIP flight once the new message is in the DOM: scroll to bottom,
  // spring the previous rows up (FLIP), and fling the tablet from the input.
  useLayoutEffect(() => {
    const p = pendingRef.current;
    if (!p) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    const rows = new Map<string, HTMLElement>();
    scroll.querySelectorAll<HTMLElement>('[data-msg-id]').forEach((el) => {
      const mid = el.getAttribute('data-msg-id');
      if (mid) rows.set(mid, el);
    });
    const row = rows.get(p.id);
    if (!row) return;
    pendingRef.current = null;
    scroll.scrollTop = scroll.scrollHeight;

    const BOUNCE = 'cubic-bezier(0.32,1.12,0.5,1)';
    p.prevTops.forEach((oldTop, id) => {
      if (id === p.id) return;
      const el = rows.get(id);
      if (!el) return;
      const delta = oldTop - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 0.5) return;
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], {
        duration: 560,
        easing: BOUNCE,
      });
    });

    const pill = row.querySelector<HTMLElement>('[data-send-pill]') || row;
    const to = pill.getBoundingClientRect();
    const container = (scroll.closest('[data-artboard]') as HTMLElement | null) ?? scroll;
    setSendFly({ from: p.from, to, text: p.text, id: p.id, container });
  }, [msgs]);

  const userCount = msgs.filter((m) => m.role === 'me').length;
  const limitReached = userCount >= MENTOR_MAX_MSGS;

  /** `presetAnswer` set → a chip question with a canned reply (no model call). */
  function send(raw?: string, presetAnswer?: string) {
    const text = (raw ?? input).trim().slice(0, MENTOR_MAX_CHARS);
    if (!text || typing || limitReached) return;
    chatSeq += 1;
    const id = `q-${chatSeq}`;

    // FIRST: input rect (flight start) + previous row positions for the FLIP.
    const from = inputRef.current?.getBoundingClientRect() ?? null;
    const prevTops = new Map<string, number>();
    scrollRef.current?.querySelectorAll<HTMLElement>('[data-msg-id]').forEach((el) => {
      const mid = el.getAttribute('data-msg-id');
      if (mid) prevTops.set(mid, el.getBoundingClientRect().top);
    });

    setMsgs((m) => [...m, { id, role: 'me', text }]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    onSolve(); // latch crystal (no confetti for chat sends)

    if (from) {
      setHideId(id);
      pendingRef.current = { id, text, from, prevTops };
      // safety: reveal if the animation never started
      window.setTimeout(() => setHideId((cur) => (cur === id ? null : cur)), 1200);
    }

    setTyping(true);

    // Chip questions come with a canned answer — no model call, just a short
    // beat so the reply doesn't pop in instantly.
    if (presetAnswer) {
      timerRef.current = setTimeout(() => {
        setTyping(false);
        chatSeq += 1;
        setMsgs((m) => [...m, { id: `a-${chatSeq}`, role: 'ai', text: presetAnswer }]);
      }, 550);
      return;
    }

    // Custom message → ask the light AI (Haiku 4.5) via our route; keep the
    // prior turns as context. Falls back to a local guiding question on failure.
    const history = msgs.map((m) => ({
      role: m.role === 'me' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));
    void (async () => {
      let replyText = coachReply(text);
      try {
        const res = await fetch('/api/mentor-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history }),
        });
        if (res.ok) {
          const data = (await res.json()) as { reply?: string };
          if (typeof data.reply === 'string' && data.reply.trim()) replyText = data.reply.trim();
        }
      } catch {
        /* keep the local fallback */
      }
      setTyping(false);
      chatSeq += 1;
      setMsgs((m) => [...m, { id: `a-${chatSeq}`, role: 'ai', text: replyText }]);
    })();
  }

  const empty = msgs.length === 0 && !typing;

  return (
    <div className="flex h-full flex-col">
      {/* Chat log. Both the header (top) and the composer (bottom) float over it
          with no background plate, so messages scroll underneath and dissolve
          into the progressive blur at each edge. pt/pb reserve the space they
          occupy so content never hides fully behind them. */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={updateEdges}
          className="slim-scroll flex h-full flex-col overflow-y-auto overscroll-contain pl-3 pt-16 pb-24 -mr-4 pr-4"
        >
        {/* mt-auto keeps messages hugging the bottom (next to the composer)
            until they overflow, then it collapses and normal scrolling kicks in. */}
        <div className="mt-auto space-y-2.5">
        {msgs.map((m) =>
          m.role === 'me' ? (
            <div key={m.id} data-msg-id={m.id} className="flex justify-end">
              <span
                data-send-pill
                style={hideId === m.id ? { opacity: 0 } : { opacity: 1 }}
                className="inline-block max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-left text-caption leading-snug text-on-brand"
              >
                {m.text}
              </span>
            </div>
          ) : (
            <div
              key={m.id}
              data-msg-id={m.id}
              className="chat-reply-in flex w-fit max-w-[88%] items-start gap-2 rounded-2xl rounded-bl-sm border border-border bg-elevated px-3 py-2"
            >
              <Sparkles size={15} className="mt-0.5 shrink-0 text-brand" />
              <p className="text-caption leading-snug text-secondary">{m.text}</p>
            </div>
          ),
        )}
        {typing && (
          <div className="chat-reply-in flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-elevated px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-tertiary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
        </div>
        </div>
        {/* empty-state hint — centred in the free zone between the floating
            header (top) and the chips + composer (bottom) so it never collides
            with either. */}
        {empty && (
          <div className="pointer-events-none absolute inset-x-0 top-16 bottom-32 flex items-center justify-center px-6">
            <p className="text-center text-caption text-tertiary">
              Спроси о своём макете — например, «почему экран выглядит неаккуратно?»
            </p>
          </div>
        )}
        {/* Taller top blur so messages fade out smoothly under the header
            instead of getting clipped by a hard line. */}
        <MentorProgressiveBlur edge="top" height={96} fill active />
        <MentorProgressiveBlur edge="bottom" height={96} active={edges.bottom} />
        {/* floating header: rendered late + explicit high z (inline — the lib's
            internal blur layers carry their own z, so a Tailwind z-* utility that
            resolves to `auto` here loses to them). Text stays sharp while messages
            dissolve under it. */}
        <div
          style={{ zIndex: 50 }}
          className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 pl-3 pr-1.5 pt-1"
        >
          <div>
            <p className="text-footnote font-semibold text-primary">AI-ментор</p>
            <p className="text-caption text-tertiary">Напиши вопрос — коуч подведёт к ответу, а не решит за тебя</p>
          </div>
          {solved && <DoneBadge />}
        </div>

        {/* floating composer: same idea at the bottom — the wrapper ignores
            pointer events so scrolling works over the fade; the controls
            re-enable them. High z so it sits above the bottom blur. */}
        <div
          style={{ zIndex: 40 }}
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 pl-3 pr-1.5 pb-1"
        >
          {/* quick suggestions */}
          {msgs.length === 0 && (
            <div className="pointer-events-auto flex flex-wrap gap-2">
              {MENTOR_QA.map((item) => (
                <button
                  key={item.q}
                  type="button"
                  onClick={() => send(item.q, item.a)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-caption font-medium text-secondary transition-fast hover:bg-hover"
                >
                  {item.q}
                </button>
              ))}
            </div>
          )}

          {/* composer — type your own message (capped: this is a teaser). */}
          {limitReached ? (
            <div className="pointer-events-auto flex h-14 items-center justify-center rounded-xl border border-dashed border-border bg-surface px-4 text-center text-caption text-tertiary">
              Это демо-ментор. Полный диалог открывается после регистрации.
            </div>
          ) : (
            <div className="pointer-events-auto flex items-center gap-2">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                maxLength={MENTOR_MAX_CHARS}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 72)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Напиши сообщение ментору…"
                className="max-h-[4.5rem] min-h-[3.5rem] flex-1 resize-none overflow-y-auto rounded-xl border border-border bg-surface px-4 py-[1.125rem] text-footnote leading-snug text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={() => send()}
                aria-label="Отправить"
                disabled={!input.trim() || typing}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand transition-base hover:bg-brand-hover disabled:bg-muted disabled:text-tertiary"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>

      {sendFly && (
        <FlyingSendBubble
          from={sendFly.from}
          to={sendFly.to}
          text={sendFly.text}
          container={sendFly.container}
          onDone={() => {
            setHideId((cur) => (cur === sendFly.id ? null : cur));
            setSendFly(null);
          }}
        />
      )}
    </div>
  );
}

/* ── mode: validation engine — run, then fix the warning ─────────────── */

const CHECKS = [
  { label: 'Сетка кратна 8pt', status: 'ok' as const },
  { label: 'Выравнивание по колонкам', status: 'ok' as const },
  { label: 'Контраст текста AA', status: 'ok' as const },
  { label: 'Плотность интерфейса', status: 'warn' as const },
];

function ValidateMode({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [running, setRunning] = useState(solved);
  const [shown, setShown] = useState(solved ? CHECKS.length : 0);
  const [fixedWarn, setFixedWarn] = useState(solved);

  const doneScanning = shown >= CHECKS.length;

  function run() {
    if (running) return;
    setRunning(true);
    setShown(0);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setShown(i);
      playTick(); // soft "check drawing" tick per row
      if (i >= CHECKS.length) clearInterval(iv);
    }, 300);
  }

  function fixWarning() {
    setFixedWarn(true);
    playChime(); // light "resolved" confirmation
    onSolve();
  }

  return (
    <div>
      <ModeHeader title="Движок валидации" hint="Запусти проверку, затем исправь замечание" done={solved} />
      <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
        {CHECKS.map((c, i) => {
          const visible = i < shown;
          const isWarn = c.status === 'warn' && !fixedWarn;
          return (
            <div
              key={c.label}
              className={`flex items-center gap-2 text-caption transition-base ${
                visible ? 'opacity-100' : 'opacity-30'
              }`}
            >
              {!visible ? (
                <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
              ) : isWarn ? (
                <AlertTriangle size={14} className="shrink-0 text-warning" />
              ) : (
                <Check size={14} className="shrink-0 text-success" />
              )}
              <span className={visible ? 'text-secondary' : 'text-tertiary'}>{c.label}</span>
              {visible && c.status === 'warn' && (
                <span
                  className={`ml-auto text-caption font-medium ${fixedWarn ? 'text-success' : 'text-warning'}`}
                >
                  {fixedWarn ? 'исправлено' : 'слишком плотно'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* reserved slot so swapping button ↔ button ↔ success text never jumps the card */}
      <div className="mt-3 flex min-h-[38px] items-center">
        {!running && (
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-caption font-medium text-on-brand transition-base hover:bg-brand-hover"
          >
            <ShieldCheck size={13} /> Запустить проверку
          </button>
        )}

        {running && doneScanning && !fixedWarn && (
          <button
            type="button"
            onClick={fixWarning}
            className="inline-flex items-center gap-1.5 rounded-lg border border-warning bg-warning/10 px-3 py-2 text-caption font-medium text-warning transition-base hover:bg-warning/15"
          >
            <Plus size={13} /> Добавить воздух между блоками
          </button>
        )}

        {fixedWarn && <p className="text-caption text-success">✓ Все 4 проверки пройдены — макет чист</p>}
      </div>
    </div>
  );
}
