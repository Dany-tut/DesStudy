'use client';

import { useEffect, useRef, useState } from 'react';
import {
  GraduationCap,
  Search,
  Bell,
  Check,
  Plus,
  Layers,
  Pin,
  Wind,
  PanelLeft,
  PanelRight,
  PanelBottom,
  Menu,
  Minimize2,
  Play,
} from 'lucide-react';

/**
 * DRAFT — exercise type "bar-builder".
 * The learner assembles a top/nav bar like a constructor: toggle parts in/out,
 * choose how it sits on the page, pick a compact variant, and align the nav.
 * The preview is a real scrollable page so the positioning behaviour is felt,
 * not just described — and selecting a mode *plays* a scripted scroll so you
 * see how that mode behaves (static fades away, fixed/floating stays pinned).
 */

type Placement =
  | 'static'
  | 'fixedTop'
  | 'floatTop'
  | 'floatBottom'
  | 'sidebarLeft'
  | 'sidebarRight';
type Variant = 'full' | 'burger' | 'mini';
type PartKey = 'logo' | 'nav' | 'search' | 'cta' | 'avatar';

const PLACEMENTS: {
  key: Placement;
  label: string;
  icon: typeof Pin;
  hint: string;
}[] = [
  { key: 'static', label: 'Статичный', icon: Layers, hint: 'едет вместе со страницей' },
  { key: 'fixedTop', label: 'Фиксированный', icon: Pin, hint: 'прилипает к верху' },
  { key: 'floatTop', label: 'Плавающий сверху', icon: Wind, hint: 'парит с отступом и тенью' },
  { key: 'floatBottom', label: 'Плавающий снизу', icon: PanelBottom, hint: 'плашка у нижнего края' },
  { key: 'sidebarLeft', label: 'Боковой слева', icon: PanelLeft, hint: 'вертикальный список' },
  { key: 'sidebarRight', label: 'Боковой справа', icon: PanelRight, hint: 'вертикальный список' },
];

const VARIANTS: { key: Variant; label: string; icon: typeof Menu; hint: string }[] = [
  { key: 'full', label: 'Полный', icon: Layers, hint: 'всё раскрыто' },
  { key: 'burger', label: 'Бургер', icon: Menu, hint: 'меню под иконку' },
  { key: 'mini', label: 'Мини', icon: Minimize2, hint: 'свёрнутый, компактный' },
];

const PARTS: { key: PartKey; label: string }[] = [
  { key: 'logo', label: 'Логотип' },
  { key: 'nav', label: 'Навигация' },
  { key: 'search', label: 'Поиск' },
  { key: 'cta', label: 'Кнопка CTA' },
  { key: 'avatar', label: 'Профиль' },
];

const TARGET = {
  placement: 'floatTop' as Placement,
  variant: 'full' as Variant,
  parts: { logo: true, nav: true, search: false, cta: true, avatar: false },
  navCenter: true,
};

const isSidebar = (p: Placement) => p === 'sidebarLeft' || p === 'sidebarRight';

export function BarBuilder() {
  const [placement, setPlacement] = useState<Placement>('static');
  const [variant, setVariant] = useState<Variant>('full');
  const [parts, setParts] = useState<Record<PartKey, boolean>>({
    logo: true,
    nav: true,
    search: false,
    cta: false,
    avatar: false,
  });
  const [navCenter, setNavCenter] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  // Placement rail: a single row of icon squares. Clicking one morphs it out to
  // fill the whole row (icon + label) while the rest collapse away; clicking the
  // expanded one again morphs the others back in. All widths are CSS-animated.
  const [railOpen, setRailOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Floating overlay scrollbar — painted on top of the content so the bar can
  // reach the full width (no reserved native gutter). Thumb tracks scroll and
  // can be dragged.
  const [thumb, setThumb] = useState({ top: 0, height: 0, show: false });
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null);

  const syncThumb = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    if (scrollHeight <= clientHeight + 1) {
      setThumb((t) => (t.show ? { ...t, show: false } : t));
      return;
    }
    const height = Math.max(28, (clientHeight / scrollHeight) * clientHeight);
    const top = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height);
    setThumb({ top, height, show: true });
  };

  useEffect(() => {
    syncThumb();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(syncThumb);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, variant, parts, navCenter]);

  const onThumbDown = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startScroll: el.scrollTop };
  };
  const onThumbMove = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;
    const { scrollHeight, clientHeight } = el;
    const trackable = clientHeight - thumb.height;
    if (trackable <= 0) return;
    const dy = e.clientY - drag.startY;
    el.scrollTop = drag.startScroll + (dy / trackable) * (scrollHeight - clientHeight);
  };
  const onThumbUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const togglePart = (k: PartKey) => setParts((p) => ({ ...p, [k]: !p[k] }));

  // Scripted scroll: glide down and back so the mode's behaviour is visible —
  // a static bar scrolls away under the top fade, fixed/floating stay put.
  const playDemo = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const max = el.scrollHeight - el.clientHeight;
    const target = Math.min(max, 240);
    const duration = 2000;
    const start = performance.now();
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Down for the first half, back up for the second — a there-and-back glide.
      const phase = t < 0.5 ? ease(t * 2) : ease((1 - t) * 2);
      el.scrollTop = phase * target;
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // Play on every mode change when autoplay is on. Sidebars don't scroll away,
  // but the glide still shows content moving past a pinned rail.
  useEffect(() => {
    if (autoplay) playDemo();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, variant]);

  const solved =
    placement === TARGET.placement &&
    variant === TARGET.variant &&
    navCenter === TARGET.navCenter &&
    (Object.keys(parts) as PartKey[]).every((k) => parts[k] === TARGET.parts[k]);

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">Как бар сидит на странице</p>
          <div className="flex w-full overflow-hidden">
            {PLACEMENTS.map(({ key, label, icon: Icon, hint }, i) => {
              const active = placement === key;
              const expanded = railOpen && active; // fills the whole row
              const hidden = railOpen && !active; // morphed away
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  onClick={() => {
                    if (railOpen) {
                      if (active) setRailOpen(false);
                      else setPlacement(key);
                    } else {
                      setPlacement(key);
                      setRailOpen(true);
                    }
                  }}
                  style={{
                    flexGrow: 0,
                    flexShrink: 0,
                    minWidth: 0,
                    width: expanded ? '100%' : hidden ? 0 : '2.75rem',
                    marginLeft: i === 0 || hidden ? 0 : '0.375rem',
                    opacity: hidden ? 0 : 1,
                    borderWidth: hidden ? 0 : 1,
                    transitionProperty: 'width, margin, opacity',
                    transitionDuration: '320ms',
                    transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
                  }}
                  className={[
                    'flex h-11 items-center overflow-hidden rounded-xl border text-left',
                    expanded ? 'justify-start px-3' : 'justify-center',
                    active
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-surface text-tertiary hover:bg-hover hover:text-primary',
                  ].join(' ')}
                >
                  <Icon size={17} className="shrink-0" />
                  <span
                    className="flex min-w-0 flex-col overflow-hidden whitespace-nowrap transition-all duration-300"
                    style={{
                      maxWidth: expanded ? '12rem' : 0,
                      marginLeft: expanded ? '0.625rem' : 0,
                      opacity: expanded ? 1 : 0,
                    }}
                  >
                    <span className="truncate text-footnote font-medium leading-tight text-primary">
                      {label}
                    </span>
                    <span className="truncate text-caption leading-tight text-tertiary">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">Вид бара</p>
          <div className="inline-flex w-full rounded-lg bg-muted p-1">
            {VARIANTS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setVariant(key)}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-footnote font-medium transition-fast',
                  variant === key ? 'bg-brand text-on-brand' : 'text-secondary hover:text-primary',
                ].join(' ')}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">Навигация</p>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {[
              { v: false, label: 'Слева' },
              { v: true, label: 'По центру' },
            ].map(({ v, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setNavCenter(v)}
                className={[
                  'rounded-md px-4 py-2 text-footnote font-medium transition-fast',
                  navCenter === v ? 'bg-brand text-on-brand' : 'text-secondary hover:text-primary',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">Из чего собрать</p>
          {/* Horizontal scroll with edge fades — parts can exceed 5 */}
          <div className="relative">
            <div className="hide-native-scroll flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain pb-1">
              {PARTS.map(({ key, label }) => {
                const on = parts[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePart(key)}
                    className={[
                      'flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-footnote font-medium transition-fast',
                      on
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border bg-muted text-secondary hover:text-primary',
                    ].join(' ')}
                  >
                    {on ? <Check size={14} /> : <Plus size={14} />}
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-canvas to-transparent" />
          </div>
        </div>

        {/* Replay + autoplay toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playDemo}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-medium text-primary transition-fast hover:bg-hover"
          >
            <Play size={14} />
            Проиграть
          </button>
          <button
            type="button"
            onClick={() => setAutoplay((a) => !a)}
            className={[
              'flex items-center gap-2 rounded-lg px-3 py-2 text-footnote font-medium transition-fast',
              autoplay
                ? 'bg-brand/10 text-brand'
                : 'border border-border bg-surface text-secondary hover:text-primary',
            ].join(' ')}
          >
            {autoplay ? <Check size={14} /> : <Plus size={14} />}
            Автопроигрыш
          </button>
        </div>
      </div>

      {/* ── Live preview (scrollable page) ───────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-canvas">
        <div className="relative h-[360px]">
          {/* Top fade so a static bar visibly dissolves as it scrolls under. */}
          {placement === 'static' && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-canvas to-transparent" />
          )}

          <div
            ref={scrollRef}
            onScroll={syncThumb}
            className={[
              'hide-native-scroll h-full overflow-y-auto overscroll-contain',
              isSidebar(placement) ? 'flex' : 'block',
            ].join(' ')}
          >
            {placement === 'sidebarRight' && <PageContent placement={placement} />}

            <BarPreview
              placement={placement}
              variant={variant}
              parts={parts}
              navCenter={navCenter}
            />

            {placement !== 'sidebarRight' && <PageContent placement={placement} />}
          </div>

          {/* Floating overlay scrollbar — always painted above the bar */}
          {thumb.show && (
            <div
              onPointerDown={onThumbDown}
              onPointerMove={onThumbMove}
              onPointerUp={onThumbUp}
              className="absolute right-1 z-20 w-1.5 cursor-grab rounded-full bg-border-strong transition-colors hover:bg-tertiary active:cursor-grabbing"
              style={{ top: thumb.top, height: thumb.height }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PageContent({ placement }: { placement: Placement }) {
  const padTop =
    placement === 'fixedTop' || placement === 'floatTop' ? 84 : isSidebar(placement) ? 16 : 16;
  const padBottom = placement === 'floatBottom' ? 84 : 16;

  return (
    <div
      className="flex flex-1 flex-col gap-3 p-4"
      style={{ paddingTop: padTop, paddingBottom: padBottom }}
    >
      <div className="h-28 rounded-lg bg-surface" />
      <div className="h-4 w-2/3 rounded-full bg-muted" />
      <div className="h-4 w-1/2 rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-lg bg-surface" />
        <div className="h-24 rounded-lg bg-surface" />
      </div>
      <div className="h-4 w-3/4 rounded-full bg-muted" />
      <div className="h-40 rounded-lg bg-surface" />
      <div className="h-4 w-1/2 rounded-full bg-muted" />
      <div className="h-40 rounded-lg bg-surface" />
    </div>
  );
}

function BarPreview({
  placement,
  variant,
  parts,
  navCenter,
}: {
  placement: Placement;
  variant: Variant;
  parts: Record<PartKey, boolean>;
  navCenter: boolean;
}) {
  const sidebar = isSidebar(placement);
  const floating = placement === 'floatTop' || placement === 'floatBottom';
  const sticky = placement === 'fixedTop' || floating;
  const mini = variant === 'mini';

  // Vertical rail — the sidebar layout renders parts stacked and pinned.
  if (sidebar) {
    return (
      <div
        className="sticky top-0 h-[360px] shrink-0 border-border bg-elevated"
        style={{
          width: mini ? 56 : 176,
          borderRightWidth: placement === 'sidebarLeft' ? 1 : 0,
          borderLeftWidth: placement === 'sidebarRight' ? 1 : 0,
        }}
      >
        <div className="flex h-full flex-col gap-4 p-3">
          {parts.logo && (
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand">
                <GraduationCap size={15} />
              </span>
              {!mini && <span className="text-callout font-semibold text-primary">DesStudy</span>}
            </span>
          )}
          {parts.nav && (
            <nav className="flex flex-col gap-2">
              {(variant === 'burger' ? ['Меню'] : ['Главная', 'Курсы', 'О нас']).map((l) =>
                variant === 'burger' ? (
                  <span
                    key={l}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-secondary"
                  >
                    <Menu size={16} />
                  </span>
                ) : (
                  <span
                    key={l}
                    className="truncate text-footnote font-medium text-secondary"
                    title={l}
                  >
                    {mini ? l[0] : l}
                  </span>
                ),
              )}
            </nav>
          )}
          <span className="flex-1" />
          {parts.search && !mini && (
            <span className="flex items-center gap-2 rounded-lg bg-muted px-2 py-2 text-caption text-tertiary">
              <Search size={14} />
              Поиск
            </span>
          )}
          {parts.cta && (
            <button
              type="button"
              className="rounded-lg bg-brand px-3 py-2 text-footnote font-medium text-on-brand"
            >
              {mini ? '+' : 'Начать'}
            </button>
          )}
          {parts.avatar && (
            <span className="flex items-center gap-2">
              <span className="h-8 w-8 shrink-0 rounded-full bg-brand/30" />
              {!mini && <span className="text-caption text-tertiary">Профиль</span>}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Horizontal bar — static / fixed / floating (top or bottom).
  const wrapStyle: React.CSSProperties = sticky
    ? {
        position: 'sticky',
        top: placement === 'floatBottom' ? undefined : floating ? 12 : 0,
        bottom: placement === 'floatBottom' ? 12 : undefined,
        zIndex: 5,
      }
    : { position: 'relative' };

  return (
    <div
      style={wrapStyle}
      className={[floating ? 'px-3' : '', placement === 'floatTop' ? 'pt-3' : ''].join(' ')}
    >
      <div
        className={[
          'flex items-center gap-3 bg-elevated',
          // Floating pill: equal padding every side so the leading logo and
          // trailing CTA sit with a strict 1:1 inset (the 36px controls drive
          // the height, so their top/bottom gap equals left/right).
          floating
            ? `rounded-full border border-border shadow-lg ${mini ? 'p-2' : 'p-2.5'}`
            : 'border-b border-border px-4',
        ].join(' ')}
        style={floating ? undefined : { height: mini ? 44 : 56 }}
      >
        {parts.logo && (
          <span className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-on-brand">
              <GraduationCap size={16} />
            </span>
            {!mini && <span className="text-callout font-semibold text-primary">DesStudy</span>}
          </span>
        )}

        {parts.nav &&
          (variant === 'burger' ? (
            <>
              {!navCenter && <span className="flex-1" />}
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-secondary',
                  navCenter ? 'mx-auto' : '',
                ].join(' ')}
              >
                <Menu size={16} />
              </span>
            </>
          ) : (
            <nav
              className={[
                'flex items-center gap-4',
                navCenter ? 'flex-1 justify-center' : '',
              ].join(' ')}
            >
              {['Главная', 'Курсы', 'О нас'].map((l) => (
                <span key={l} className="text-footnote font-medium text-secondary">
                  {l}
                </span>
              ))}
            </nav>
          ))}

        {/* Spacer pushes trailing items right when nav isn't centered */}
        {!(parts.nav && (navCenter || variant === 'burger')) && <span className="flex-1" />}

        {parts.search && !mini && (
          <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-caption text-tertiary">
            <Search size={14} />
            Поиск
          </span>
        )}
        {parts.cta && (
          <button
            type="button"
            className="flex h-9 items-center rounded-full bg-brand px-4 text-footnote font-medium text-on-brand"
          >
            Начать
          </button>
        )}
        {parts.avatar && (
          <span className="flex items-center gap-2">
            {!mini && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-tertiary">
                <Bell size={15} />
              </span>
            )}
            <span className="h-9 w-9 rounded-full bg-brand/30" />
          </span>
        )}
      </div>
    </div>
  );
}
