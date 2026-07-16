'use client';

import { useState } from 'react';
import { Menu, Type, LayoutGrid, PanelsTopLeft } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';

/**
 * DRAFT lesson block — "breakpoint-triggers". A short theory unit on WHY
 * breakpoints exist, plus three self-contained mini-demos, one per trigger type:
 *   A. Line length (measure)     — text: 1 → 2 columns once the line is too long.
 *   B. Element min-width          — cards: 1 → 2 → 3 → 4 columns (auto-fit).
 *   C. Fit / overflow             — nav: full row → burger when it stops fitting.
 *
 * The point: a breakpoint isn't tied to a device, it's tied to the moment the
 * *content* stops working. Each demo scales a virtual viewport (block width is
 * proportional to MAX so it always fits its frame — never clips) and reflows in
 * place, so the learner sees the same layout break for three different reasons.
 * Uses the design-system Slider + tokens. Not wired into the lesson flow yet.
 */

const MIN = 320;
const MAX = 960;

/* Shared shell for a single mini-demo: trigger chip, live viewport preview,
   the design-system Slider, and a one-line "what just happened" caption. */
function Demo({
  icon,
  trigger,
  width,
  onChange,
  status,
  caption,
  children,
}: {
  icon: React.ReactNode;
  trigger: string;
  width: number;
  onChange: (v: number) => void;
  status: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-canvas p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-caption font-semibold text-brand">
          {icon}
          {trigger}
        </span>
        <span className="text-caption font-semibold tabular-nums text-tertiary">{status}</span>
      </div>

      {/* Preview area — the growing viewport lives inside, left-aligned. */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface p-3">{children}</div>

      <div className="mt-4">
        <Slider value={width} min={MIN} max={MAX} step={10} unit="px" onChange={onChange} />
      </div>
      <p className="mt-2 text-footnote text-secondary">{caption}</p>
    </div>
  );
}

/* Filler "text line" bar. */
function Line({ w = '100%' }: { w?: string }) {
  return <div className="h-2 rounded-sm bg-tertiary/30" style={{ width: w }} />;
}

/* A — line length (measure). One text column grows toward a fixed comfort guide;
   once the line would be too long, it splits into 2 columns. */
function MeasureDemo() {
  const [width, setWidth] = useState(420);
  const MEASURE = 640;
  const twoCol = width > MEASURE;
  const blockPct = (width / MAX) * 100;
  const guidePct = (MEASURE / MAX) * 100;

  return (
    <Demo
      icon={<Type size={12} strokeWidth={2.5} />}
      trigger="Длина строки"
      width={width}
      onChange={setWidth}
      status={twoCol ? '2 колонки' : '1 колонка'}
      caption={
        twoCol
          ? 'Строка переросла комфортную длину (~640px) — разбили на 2 колонки, и каждая строка снова короткая.'
          : 'Одна колонка читается спокойно. Тяни шире — как только строка перельётся за пунктир, пора на 2 колонки.'
      }
    >
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
    </Demo>
  );
}

/* B — element min-width. Cards keep a comfortable minimum width; the column
   count follows the viewport: 1 → 2 → 3 → 4 (this is `auto-fit minmax`). */
function MinWidthDemo() {
  const [width, setWidth] = useState(480);
  const MINCARD = 220; // comfortable min card width (virtual px)
  const cols = Math.max(1, Math.min(4, Math.floor(width / MINCARD)));
  const blockPct = (width / MAX) * 100;

  return (
    <Demo
      icon={<LayoutGrid size={12} strokeWidth={2.5} />}
      trigger="Мин. ширина элемента"
      width={width}
      onChange={setWidth}
      status={`${cols} ${cols === 1 ? 'колонка' : cols < 5 ? 'колонки' : 'колонок'}`}
      caption={`Карточка не уже ~${MINCARD}px. Стало бы теснее — колонок меньше; появилось место — больше. Так работает auto-fit.`}
    >
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
    </Demo>
  );
}

/* C — fit / overflow. The nav shows all links in a row until they stop fitting,
   then collapses to a burger. The trigger is "does it fit", not line length. */
function FitDemo() {
  const [width, setWidth] = useState(760);
  const NAV_NEED = 620; // width the full nav row needs to fit
  const collapsed = width < NAV_NEED;
  const blockPct = (width / MAX) * 100;
  const links = ['Главная', 'Курсы', 'Тарифы', 'Блог', 'Контакты'];

  return (
    <Demo
      icon={<PanelsTopLeft size={12} strokeWidth={2.5} />}
      trigger="Помещаемость"
      width={width}
      onChange={setWidth}
      status={collapsed ? 'бургер' : 'меню в строку'}
      caption={
        collapsed
          ? 'Ссылки перестали помещаться в строку — свернули в бургер. Триггер не про текст, а про то, влезает ли меню.'
          : 'Меню целиком помещается — показываем все пункты. Сузь до предела — и оно свернётся в бургер.'
      }
    >
      <div
        className="flex items-center gap-3 rounded-md border border-border bg-canvas px-3 py-2.5"
        style={{ width: `${blockPct}%` }}
      >
        <div className="h-4 w-4 shrink-0 rounded bg-brand" />
        <div className="h-2.5 w-14 shrink-0 rounded-sm bg-brand/40" />
        {collapsed ? (
          <button
            type="button"
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-secondary"
            aria-label="Меню"
          >
            <Menu size={15} />
          </button>
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
    </Demo>
  );
}

export function BreakpointTriggers() {
  return (
    <div className="w-full max-w-[640px] rounded-2xl border border-border bg-surface p-5">
      {/* Theory */}
      <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Теория</p>
      <p className="mt-1 text-callout font-semibold text-primary">
        Брейкпоинт ставят не «под устройство», а туда, где контенту становится некомфортно
      </p>
      <p className="mt-2 text-footnote text-secondary">
        Экран меняется плавно, а раскладка ломается в конкретной точке — там, где что-то перестаёт
        работать. Причин ровно три, и у каждой свой триггер. Ниже — по одной живой мини-демке на каждый.
      </p>

      <div className="mt-5 space-y-4">
        <MeasureDemo />
        <MinWidthDemo />
        <FitDemo />
      </div>

      {/* Real-world examples */}
      <div className="mt-6 rounded-xl border border-border bg-canvas p-4">
        <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">В реальном мире</p>
        <ul className="mt-2 space-y-2 text-footnote text-secondary">
          <li>
            <span className="font-semibold text-primary">Длина строки</span> — Medium и блоги держат текст
            ~680px даже на большом мониторе, чтобы строка оставалась читаемой.
          </li>
          <li>
            <span className="font-semibold text-primary">Мин. ширина элемента</span> — Pinterest и товарные
            сетки (Ozon, Amazon) наращивают колонки 2 → 3 → 4 → 5 по мере роста экрана.
          </li>
          <li>
            <span className="font-semibold text-primary">Помещаемость</span> — навигация сайтов и сайдбары
            дашбордов (Notion, Linear) сворачиваются в бургер/иконки, когда перестают влезать.
          </li>
        </ul>
      </div>

      <p className="mt-4 text-footnote text-tertiary">
        Вывод: у хорошего интерфейса брейкпоинтов больше, чем «мобилка / планшет / десктоп» — у каждого блока
        свой момент слома. В CSS это и есть{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-[0.85em] text-secondary">
          repeat(auto-fit, minmax(220px, 1fr))
        </code>
        .
      </p>
    </div>
  );
}
