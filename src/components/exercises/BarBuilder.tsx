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
import { Button } from '@/components/ui/Button';
import type {
  BarBuildExercise,
  BarBuildAnswer,
  BarPlacement,
  BarVariant,
  BarPartKey,
} from '@/lib/curriculum/types';
import { useT } from '@/lib/i18n/client';

/**
 * Production control for the `bar-build` exercise. The learner assembles a
 * nav/top bar like a constructor: how it sits on the page, its compact variant,
 * which parts are in it, and how the nav aligns. Selecting a placement *plays*
 * a scripted scroll so the behaviour is felt. Controlled: parent owns the
 * answer via value/onChange; validation lives in the deterministic engine.
 */

const PLACEMENTS: {
  key: BarPlacement;
  labelKey: string;
  icon: typeof Pin;
  hintKey: string;
}[] = [
  { key: 'static', labelKey: 'placementStatic', icon: Layers, hintKey: 'placementStaticHint' },
  { key: 'fixedTop', labelKey: 'placementFixedTop', icon: Pin, hintKey: 'placementFixedTopHint' },
  { key: 'floatTop', labelKey: 'placementFloatTop', icon: Wind, hintKey: 'placementFloatTopHint' },
  { key: 'floatBottom', labelKey: 'placementFloatBottom', icon: PanelBottom, hintKey: 'placementFloatBottomHint' },
  { key: 'sidebarLeft', labelKey: 'placementSidebarLeft', icon: PanelLeft, hintKey: 'placementSidebarLeftHint' },
  { key: 'sidebarRight', labelKey: 'placementSidebarRight', icon: PanelRight, hintKey: 'placementSidebarRightHint' },
];

const VARIANTS: { key: BarVariant; labelKey: string; icon: typeof Menu }[] = [
  { key: 'full', labelKey: 'variantFull', icon: Layers },
  { key: 'burger', labelKey: 'variantBurger', icon: Menu },
  { key: 'mini', labelKey: 'variantMini', icon: Minimize2 },
];

const PARTS: { key: BarPartKey; labelKey: string }[] = [
  { key: 'logo', labelKey: 'partLogo' },
  { key: 'nav', labelKey: 'partNav' },
  { key: 'search', labelKey: 'partSearch' },
  { key: 'cta', labelKey: 'partCta' },
  { key: 'avatar', labelKey: 'partAvatar' },
];

const isSidebar = (p: BarPlacement) => p === 'sidebarLeft' || p === 'sidebarRight';

export function BarBuilder({
  value,
  disabled = false,
  onChange,
}: {
  exercise?: BarBuildExercise;
  value: BarBuildAnswer;
  disabled?: boolean;
  onChange: (next: BarBuildAnswer) => void;
}) {
  const { t } = useT();
  const { placement, variant, parts, navAlign } = value;

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const set = (patch: Partial<BarBuildAnswer>) => onChange({ ...value, ...patch });
  const togglePart = (k: BarPartKey) => set({ parts: { ...parts, [k]: !parts[k] } });

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
      const phase = t < 0.5 ? ease(t * 2) : ease((1 - t) * 2);
      el.scrollTop = phase * target;
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // Play whenever the placement/variant changes.
  useEffect(() => {
    playDemo();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, variant]);

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* ── Controls ─────────────────────────────────────────── */}
      <fieldset disabled={disabled} className="flex flex-col gap-5 disabled:opacity-60">
        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">{t('exercises.barBuilder.placementHeading')}</p>
          <div className="flex flex-col gap-2">
            {PLACEMENTS.map(({ key, labelKey, icon: Icon, hintKey }) => {
              const active = placement === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set({ placement: key })}
                  className={[
                    'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-fast',
                    active
                      ? 'border-brand bg-brand/10 text-primary'
                      : 'border-border bg-surface text-secondary hover:bg-hover hover:text-primary',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      active ? 'bg-brand text-on-brand' : 'bg-muted text-tertiary',
                    ].join(' ')}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-callout font-medium text-primary">{t(`exercises.barBuilder.${labelKey}`)}</span>
                    <span className="block text-caption text-tertiary">{t(`exercises.barBuilder.${hintKey}`)}</span>
                  </span>
                  {active && <Check size={16} className="text-brand" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">{t('exercises.barBuilder.variantHeading')}</p>
          <div className="inline-flex w-full rounded-lg bg-muted p-1">
            {VARIANTS.map(({ key, labelKey, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => set({ variant: key })}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-footnote font-medium transition-fast',
                  variant === key ? 'bg-brand text-on-brand' : 'text-secondary hover:text-primary',
                ].join(' ')}
              >
                <Icon size={14} />
                {t(`exercises.barBuilder.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">{t('exercises.barBuilder.partsHeading')}</p>
          <EdgeFadeRow>
            {PARTS.map(({ key, labelKey }) => {
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
                  {t(`exercises.barBuilder.${labelKey}`)}
                </button>
              );
            })}
          </EdgeFadeRow>
        </div>

        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">{t('exercises.barBuilder.navHeading')}</p>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {[
              { v: 'left' as const, labelKey: 'navLeft' },
              { v: 'center' as const, labelKey: 'navCenter' },
              { v: 'right' as const, labelKey: 'navRight' },
            ].map(({ v, labelKey }) => (
              <button
                key={v}
                type="button"
                onClick={() => set({ navAlign: v })}
                className={[
                  'rounded-md px-4 py-2 text-footnote font-medium transition-fast',
                  navAlign === v ? 'bg-brand text-on-brand' : 'text-secondary hover:text-primary',
                ].join(' ')}
              >
                {t(`exercises.barBuilder.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={playDemo}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-medium text-primary transition-fast hover:bg-hover"
          >
            <Play size={14} />
            {t('exercises.barBuilder.playMode')}
          </button>
        </div>
      </fieldset>

      {/* ── Live preview (scrollable page) ───────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-canvas">
        <div className="relative h-[360px]">
          {placement === 'static' && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-canvas to-transparent" />
          )}

          <div
            ref={scrollRef}
            className={[
              'h-full overflow-y-auto overscroll-contain',
              isSidebar(placement) ? 'flex' : 'block',
            ].join(' ')}
          >
            {(placement === 'sidebarRight' || placement === 'floatBottom') && (
              <PageContent placement={placement} />
            )}
            <BarPreview placement={placement} variant={variant} parts={parts} navAlign={navAlign} />
            {placement !== 'sidebarRight' && placement !== 'floatBottom' && (
              <PageContent placement={placement} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Horizontal scroller with edge-aware fades: the left fade only appears once
 * you've scrolled away from the start, the right fade hides once you hit the
 * end — so a fade always signals "there's more this way" and never lies.
 */
function EdgeFadeRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setEdges({
      start: el.scrollLeft > 1,
      end: el.scrollLeft < maxScroll - 1,
    });
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={update}
        className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-surface via-surface/80 to-transparent transition-opacity duration-200"
        style={{ opacity: edges.start ? 1 : 0 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-surface via-surface/80 to-transparent transition-opacity duration-200"
        style={{ opacity: edges.end ? 1 : 0 }}
      />
    </div>
  );
}

function PageContent({ placement }: { placement: BarPlacement }) {
  const padTop = placement === 'fixedTop' || placement === 'floatTop' ? 84 : 16;
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
  navAlign,
}: {
  placement: BarPlacement;
  variant: BarVariant;
  parts: Record<BarPartKey, boolean>;
  navAlign: 'left' | 'center' | 'right';
}) {
  const sidebar = isSidebar(placement);
  const floating = placement === 'floatTop' || placement === 'floatBottom';
  const sticky = placement === 'fixedTop' || floating;
  const mini = variant === 'mini';

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
            <Button variant="primary" size="sm" className={mini ? 'w-full px-0' : 'w-full'}>
              {mini ? '+' : 'Начать'}
            </Button>
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
          // Floating pill: equal padding on every side so the leading logo and
          // trailing CTA sit with a strict 1:1 inset (the tallest control — the
          // CTA — drives the height, so its top/bottom gap equals left/right).
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

        {/* Right-aligned nav: a leading spacer pushes it (and the trailing
            controls) to the right edge. */}
        {parts.nav && navAlign === 'right' && <span className="flex-1" />}

        {parts.nav &&
          (variant === 'burger' ? (
            <>
              {navAlign === 'left' && <span className="flex-1" />}
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-secondary',
                  navAlign === 'center' ? 'mx-auto' : '',
                ].join(' ')}
              >
                <Menu size={16} />
              </span>
            </>
          ) : (
            <nav
              className={[
                'flex items-center gap-4',
                navAlign === 'center' ? 'flex-1 justify-center' : '',
              ].join(' ')}
            >
              {['Главная', 'Курсы', 'О нас'].map((l) => (
                <span key={l} className="text-footnote font-medium text-secondary">
                  {l}
                </span>
              ))}
            </nav>
          ))}

        {/* Trailing spacer: only when the trailing controls need pushing right —
            i.e. no nav, or a left-aligned inline nav. Center/right/burger nav
            already consume or push past the free space. */}
        {(!parts.nav || (navAlign === 'left' && variant !== 'burger')) && (
          <span className="flex-1" />
        )}

        {parts.search && !mini && (
          <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-caption text-tertiary">
            <Search size={14} />
            Поиск
          </span>
        )}
        {parts.cta && (
          <Button variant="primary" size="sm">
            Начать
          </Button>
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
