'use client';

import { useState } from 'react';
import {
  GraduationCap,
  Search,
  Bell,
  Check,
  Plus,
  Layers,
  Pin,
  Wind,
} from 'lucide-react';

/**
 * DRAFT — exercise type "bar-builder".
 * The learner assembles a top/nav bar like a constructor: toggle parts in/out,
 * choose how it sits on the page (static / fixed / floating), and align the nav.
 * The preview is a real scrollable page so the positioning behaviour is felt,
 * not just described. A target config drives a live "собрано верно" check.
 */

type Position = 'static' | 'fixed' | 'floating';
type PartKey = 'logo' | 'nav' | 'search' | 'cta' | 'avatar';

const POSITIONS: { key: Position; label: string; icon: typeof Pin; hint: string }[] = [
  { key: 'static', label: 'Статичный', icon: Layers, hint: 'едет вместе со страницей' },
  { key: 'fixed', label: 'Фиксированный', icon: Pin, hint: 'прилипает к верху' },
  { key: 'floating', label: 'Плавающий', icon: Wind, hint: 'парит с отступом и тенью' },
];

const PARTS: { key: PartKey; label: string }[] = [
  { key: 'logo', label: 'Логотип' },
  { key: 'nav', label: 'Навигация' },
  { key: 'search', label: 'Поиск' },
  { key: 'cta', label: 'Кнопка CTA' },
  { key: 'avatar', label: 'Профиль' },
];

const TARGET = {
  position: 'floating' as Position,
  parts: { logo: true, nav: true, search: false, cta: true, avatar: false },
  navCenter: true,
};

export function BarBuilder() {
  const [position, setPosition] = useState<Position>('static');
  const [parts, setParts] = useState<Record<PartKey, boolean>>({
    logo: true,
    nav: true,
    search: false,
    cta: false,
    avatar: false,
  });
  const [navCenter, setNavCenter] = useState(false);

  const togglePart = (k: PartKey) => setParts((p) => ({ ...p, [k]: !p[k] }));

  const solved =
    position === TARGET.position &&
    navCenter === TARGET.navCenter &&
    (Object.keys(parts) as PartKey[]).every((k) => parts[k] === TARGET.parts[k]);

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">Как бар сидит на странице</p>
          <div className="flex flex-col gap-2">
            {POSITIONS.map(({ key, label, icon: Icon, hint }) => {
              const active = position === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPosition(key)}
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
                    <span className="block text-callout font-medium text-primary">{label}</span>
                    <span className="block text-caption text-tertiary">{hint}</span>
                  </span>
                  {active && <Check size={16} className="text-brand" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-footnote font-medium text-secondary">Из чего собрать</p>
          <div className="flex flex-wrap gap-2">
            {PARTS.map(({ key, label }) => {
              const on = parts[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePart(key)}
                  className={[
                    'flex items-center gap-2 rounded-full border px-3 py-2 text-footnote font-medium transition-fast',
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

        <div
          className={[
            'flex items-center gap-2 rounded-lg px-3 py-3 text-footnote transition-base',
            solved ? 'bg-success/10 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          {solved ? <Check size={16} /> : <Layers size={16} />}
          {solved
            ? 'Собрано верно — плавающий бар, лого + навигация по центру + CTA.'
            : 'Цель: плавающий бар с логотипом, навигацией по центру и кнопкой CTA.'}
        </div>
      </div>

      {/* ── Live preview (scrollable page) ───────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-canvas">
        <div className="relative h-[360px] overflow-y-auto">
          <BarPreview position={position} parts={parts} navCenter={navCenter} />

          {/* Dummy page content so fixed/floating behaviour is visible on scroll */}
          <div className="flex flex-col gap-3 p-4" style={{ paddingTop: position === 'static' ? 16 : 84 }}>
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
        </div>
      </div>
    </div>
  );
}

function BarPreview({
  position,
  parts,
  navCenter,
}: {
  position: Position;
  parts: Record<PartKey, boolean>;
  navCenter: boolean;
}) {
  // Position styling: static flows in content; fixed sticks flush to top;
  // floating sticks with an inset + rounded + shadow.
  const sticky = position !== 'static';
  const floating = position === 'floating';

  const wrapStyle: React.CSSProperties = sticky
    ? { position: 'sticky', top: floating ? 12 : 0, zIndex: 5 }
    : { position: 'relative' };

  return (
    <div style={wrapStyle} className={floating ? 'px-3 pt-3' : ''}>
      <div
        className={[
          'flex items-center gap-3 bg-elevated px-4',
          floating
            ? 'rounded-full border border-border shadow-lg'
            : sticky
              ? 'border-b border-border'
              : 'border-b border-border',
        ].join(' ')}
        style={{ height: 56 }}
      >
        {parts.logo && (
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-on-brand">
              <GraduationCap size={15} />
            </span>
            <span className="text-callout font-semibold text-primary">DesStudy</span>
          </span>
        )}

        {parts.nav && (
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
        )}

        {/* Spacer pushes trailing items right when nav isn't centered */}
        {!(parts.nav && navCenter) && <span className="flex-1" />}

        {parts.search && (
          <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-caption text-tertiary">
            <Search size={14} />
            Поиск
          </span>
        )}
        {parts.cta && (
          <button
            type="button"
            className="rounded-full bg-brand px-4 py-2 text-footnote font-medium text-on-brand"
          >
            Начать
          </button>
        )}
        {parts.avatar && (
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-tertiary">
              <Bell size={15} />
            </span>
            <span className="h-8 w-8 rounded-full bg-brand/30" />
          </span>
        )}
      </div>
    </div>
  );
}
