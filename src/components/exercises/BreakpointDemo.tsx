'use client';

import { Menu, Type, LayoutGrid, PanelsTopLeft } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import {
  BP_MIN,
  BP_MAX,
  MEASURE,
  measureIsTwoCol,
  measureSolved,
  columnsForWidth,
  navState,
} from '@/lib/curriculum/breakpoint';

/**
 * Controlled interactive for the `breakpoint` exercise. The learner drags a
 * virtual viewport width; the preview reflows in place. One `variant` per
 * instance (measure / min-width / fit). The width flows up via onChange so
 * ExercisePlayer can validate it — the derivation math lives in
 * `@/lib/curriculum/breakpoint`, shared with the validator.
 *
 * Layout note: the preview block width is proportional to BP_MAX so it always
 * fits its frame (never clips), and it grows left→right toward its trigger.
 */

const TRIGGER: Record<
  'measure' | 'min-width' | 'fit',
  { icon: typeof Type; label: string }
> = {
  measure: { icon: Type, label: 'Длина строки' },
  'min-width': { icon: LayoutGrid, label: 'Мин. ширина элемента' },
  fit: { icon: PanelsTopLeft, label: 'Помещаемость' },
};

function Line({ w = '100%' }: { w?: string }) {
  return <div className="h-2 rounded-sm bg-tertiary/30" style={{ width: w }} />;
}

export function BreakpointDemo({
  variant,
  value,
  disabled = false,
  onChange,
}: {
  variant: 'measure' | 'min-width' | 'fit';
  value: number;
  disabled?: boolean;
  onChange: (width: number) => void;
}) {
  const width = value;
  const blockPct = (width / BP_MAX) * 100;
  const { icon: Icon, label } = TRIGGER[variant];

  // Live status shown top-right of the frame.
  const status =
    variant === 'measure'
      ? measureIsTwoCol(width)
        ? '2 колонки'
        : '1 колонка'
      : variant === 'min-width'
        ? `${columnsForWidth(width)} ${
            columnsForWidth(width) === 1 ? 'колонка' : columnsForWidth(width) < 5 ? 'колонки' : 'колонок'
          }`
        : navState(width) === 'burger'
          ? 'бургер'
          : 'меню в строку';

  return (
    <div className="rounded-xl border border-border bg-canvas p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-caption font-semibold text-brand">
          <Icon size={12} strokeWidth={2.5} />
          {label}
        </span>
        <span className="text-caption font-semibold tabular-nums text-tertiary">{status}</span>
      </div>

      {/* Preview area — the growing viewport lives inside, left-aligned. */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface p-3">
        {variant === 'measure' && <MeasurePreview width={width} blockPct={blockPct} />}
        {variant === 'min-width' && <MinWidthPreview blockPct={blockPct} cols={columnsForWidth(width)} />}
        {variant === 'fit' && <FitPreview blockPct={blockPct} collapsed={navState(width) === 'burger'} />}
      </div>

      <div className="mt-4">
        <Slider
          value={width}
          min={BP_MIN}
          max={BP_MAX}
          step={10}
          unit="px"
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

/* measure — one text column grows toward a fixed comfort guide, then splits. */
function MeasurePreview({ width, blockPct }: { width: number; blockPct: number }) {
  const twoCol = measureIsTwoCol(width);
  const guidePct = (MEASURE / BP_MAX) * 100;
  return (
    <div className="relative">
      {!twoCol && (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 border-r border-dashed border-success/70"
          style={{ left: `${guidePct}%` }}
          aria-hidden
        />
      )}
      <div
        className={['grid gap-3', twoCol ? 'grid-cols-2' : 'grid-cols-1'].join(' ')}
        style={{ width: `${blockPct}%` }}
      >
        {Array.from({ length: twoCol ? 2 : 1 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="mb-2 h-3 w-1/3 rounded-sm bg-brand/60" />
            <Line />
            <Line />
            <Line w="70%" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* min-width — cards keep a min width; column count follows the viewport. */
function MinWidthPreview({ blockPct, cols }: { blockPct: number; cols: number }) {
  return (
    <div
      className="grid gap-2"
      style={{ width: `${blockPct}%`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-canvas p-2">
          <div className="mb-1.5 h-6 rounded bg-brand/15" />
          <div className="h-1.5 w-2/3 rounded-sm bg-tertiary/40" />
        </div>
      ))}
    </div>
  );
}

/* fit — nav shows all links until they stop fitting, then collapses to a burger. */
function FitPreview({ blockPct, collapsed }: { blockPct: number; collapsed: boolean }) {
  const links = ['Главная', 'Курсы', 'Тарифы', 'Блог', 'Контакты'];
  return (
    <div
      className="flex items-center gap-3 rounded-md border border-border bg-canvas px-3 py-2.5"
      style={{ width: `${blockPct}%` }}
    >
      <div className="h-4 w-4 shrink-0 rounded bg-brand" />
      <div className="h-2.5 w-14 shrink-0 rounded-sm bg-brand/40" />
      {collapsed ? (
        <span className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-secondary">
          <Menu size={15} />
        </span>
      ) : (
        <div className="ml-auto flex items-center gap-4">
          {links.map((l) => (
            <span key={l} className="whitespace-nowrap text-footnote text-secondary">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
