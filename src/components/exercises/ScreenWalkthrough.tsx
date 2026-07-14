'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Settings2,
  CreditCard,
  Plus,
  ArrowLeftRight,
  Utensils,
  Hotel,
  Eye,
  Grid3x3,
  Boxes,
  AlignLeft,
  Palette,
  Squircle,
  PanelTop,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { ObserveConcept, ObserveReply } from '@/lib/ai/mentor';

/**
 * Screen-walkthrough — a guided, layered breakdown of one real reference
 * screen (a dark banking "Премиум карта"). The learner is walked top-to-bottom
 * through the design layers the way a mentor would: first "what do you see?",
 * then the grid, then blocks, alignment, colour, radius, and finally the bars.
 * Each layer dims the screen and spotlights only the parts that matter for it,
 * so attention is directed one concept at a time. Self-contained code component
 * (no image export) — everything is real DOM, so overlays land pixel-accurate.
 *
 * This is a prototype of a NEW exercise genre that ties the existing types
 * (fix-screen / build) into a per-theme progression. Rendered in /design-system
 * for review before we decide how it becomes a graded exercise.
 */

// The screen's own palette — this is a mock of a specific dark banking app, so
// it carries its own colours rather than our semantic tokens.
const APP = {
  bg: '#0E1013',
  surface: '#181B20',
  surfaceHi: '#20242B',
  text: '#F4F5F7',
  textDim: '#9BA1AC',
  brand: '#7B61FF',
  brandSoft: '#4B3FA8',
  accent: '#F2913D',
};

type Region =
  | 'topbar'
  | 'header'
  | 'chips'
  | 'actions'
  | 'promo'
  | 'bonusTitle'
  | 'bonuses';

interface Step {
  id: string;
  layer: string;
  icon: typeof Eye;
  title: string;
  body: string;
  /** 'all' = spotlight nothing (whole screen readable); else spotlight these. */
  regions: Region[] | 'all';
  /** overlay the column/margin grid guides. */
  grid?: boolean;
}

const STEPS: Step[] = [
  {
    id: 'see',
    layer: 'Наблюдение',
    icon: Eye,
    title: 'Что ты видишь?',
    body: 'Прежде чем разбирать — просто опиши экран вслух. Что это за продукт? Что здесь главное, что второстепенное? Куда падает взгляд первым? Пока без терминов.',
    regions: 'all',
  },
  {
    id: 'grid',
    layer: 'Сетка',
    icon: Grid3x3,
    title: 'Сетка и поля',
    body: 'Всё содержимое живёт между единых боковых полей 16px — ничего не «прилипает» к краю. Ряд действий делит ширину на 3 равные колонки, бонусы — на 2. Сетка задаёт ритм ещё до контента.',
    regions: 'all',
    grid: true,
  },
  {
    id: 'blocks',
    layer: 'Блоки',
    icon: Boxes,
    title: 'Крупные блоки',
    body: 'Экран читается как 4 смысловых блока: шапка карты с балансом → быстрые действия → промо-вклад → бонусы. Между блоками воздух больше, чем внутри — так группировка видна без линий.',
    regions: ['header', 'actions', 'promo', 'bonuses'],
  },
  {
    id: 'align',
    layer: 'Выравнивание',
    icon: AlignLeft,
    title: 'Выравнивание',
    body: 'Подписи и суммы образуют две оси: заголовок слева, баланс прижат вправо по той же линии. Три плитки действий распределены равномерно (space-between), иконки и подписи центрированы в каждой.',
    regions: ['header', 'actions'],
  },
  {
    id: 'color',
    layer: 'Цвет',
    icon: Palette,
    title: 'Цвет и акценты',
    body: 'Фиолетовый — фирменный, он только на карте и промо (то, что продаёт). Всё остальное — нейтральные поверхности. Оранжевый кэшбэка — единственный тёплый акцент, поэтому мгновенно цепляет глаз.',
    regions: ['chips', 'promo', 'bonuses'],
  },
  {
    id: 'radius',
    layer: 'Скругления',
    icon: Squircle,
    title: 'Скругления',
    body: 'Радиус растёт с размером блока: чипы карты меньше, плитки действий средние, промо и бонусы — крупные. Одна шкала на весь экран — ничего случайного, поэтому поверхность ощущается цельной.',
    regions: ['chips', 'actions', 'promo', 'bonuses'],
  },
  {
    id: 'bars',
    layer: 'Топ-бар',
    icon: PanelTop,
    title: 'Топ-бар',
    body: 'Верхняя панель минимальна: назад слева, настройки справа, между ними — воздух. Она не конкурирует с балансом за внимание, а только обрамляет экран и даёт выход.',
    regions: ['topbar'],
  },
];

/** What a strong observation of this screen would notice — ground truth for
 *  the mentor (and its offline keyword fallback). */
const OBSERVE_CONCEPTS: ObserveConcept[] = [
  { id: 'balance', label: 'баланс — главный акцент', keywords: ['баланс', '980', 'сумма', 'деньг', 'рубл', '₽'] },
  { id: 'card', label: 'карта и её название', keywords: ['карт', 'премиум', '3567', 'банк'] },
  { id: 'actions', label: 'быстрые действия', keywords: ['действ', 'оплат', 'пополн', 'перевес', 'кнопк'] },
  { id: 'promo', label: 'промо-баннер вклада (реклама, не часть карты)', keywords: ['промо', 'вклад', 'ставк', 'реклам', '18', 'баннер'] },
  { id: 'bonuses', label: 'бонусы и кэшбэк', keywords: ['бонус', 'кэшбэк', 'кешбэк', 'ресторан', 'отел', 'тур'] },
];

const SCREEN_TITLE = 'Экран банковской «Премиум карты» — баланс, действия, промо и бонусы';

/** The "what do you see?" input + mentor reflection for the observation layer. */
function ObservePanel() {
  const [text, setText] = useState('');
  const [reply, setReply] = useState<ObserveReply | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/observe-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenTitle: SCREEN_TITLE,
          concepts: OBSERVE_CONCEPTS,
          observation: text,
        }),
      });
      setReply((await res.json()) as ObserveReply);
    } catch {
      setReply({
        caught: 'Не удалось связаться с ментором.',
        missed: 'Проверь соединение и попробуй ещё раз.',
        nudge: 'Можно продолжить разбор и без обратной связи.',
        offline: true,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Опиши экран своими словами: что за продукт, что здесь главное, куда падает взгляд первым?"
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          Показать ментору
        </button>
        {reply?.offline && (
          <span className="text-caption text-tertiary">офлайн-режим</span>
        )}
      </div>

      {reply && (
        <div className="flex flex-col gap-3 rounded-lg border border-brand/30 bg-brand/5 p-4">
          <div>
            <p className="text-caption font-medium text-brand">Что ты уловил</p>
            <p className="mt-0.5 text-footnote text-primary">{reply.caught}</p>
          </div>
          <div>
            <p className="text-caption font-medium text-secondary">Присмотрись</p>
            <p className="mt-0.5 text-footnote text-primary">{reply.missed}</p>
          </div>
          <p className="text-caption text-tertiary">{reply.nudge}</p>
        </div>
      )}
    </div>
  );
}

/** The reference phone, rendered entirely in code so overlays land precisely. */
function BankScreen({ step }: { step: Step }) {
  const spotlight = step.regions !== 'all';
  const on = (r: Region) => step.regions !== 'all' && step.regions.includes(r);

  // A region is dimmed when we're spotlighting and it's not in focus.
  const dim = (r: Region) => (spotlight && !on(r) ? 'opacity-25' : 'opacity-100');
  // Focused regions get a soft ring in the app's brand colour.
  const ring = (r: Region) =>
    on(r)
      ? 'rounded-[inherit] outline outline-2 outline-offset-4'
      : '';
  const ringStyle = (r: Region) =>
    on(r) ? ({ outlineColor: APP.brand } as React.CSSProperties) : undefined;

  return (
    <div
      className="relative w-[300px] shrink-0 overflow-hidden rounded-[36px] p-4 shadow-lg transition-base"
      style={{ background: APP.bg, color: APP.text }}
    >
      {/* Column / margin grid overlay */}
      {step.grid && <GridOverlay />}

      {/* Top bar */}
      <div
        className={['relative z-10 flex items-center justify-between transition-base', ring('topbar')].join(' ')}
        style={ringStyle('topbar')}
      >
        <ArrowLeft size={20} />
        <Settings2 size={18} style={{ color: APP.textDim }} />
      </div>

      {/* Card header */}
      <div
        className={['relative z-10 mt-5 transition-base', dim('header'), ring('header')].join(' ')}
        style={ringStyle('header')}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px]" style={{ color: APP.textDim }}>
              Название карты
            </p>
            <p className="text-[15px] font-semibold">Премиум карта</p>
          </div>
          <p className="text-[15px] font-semibold tabular-nums">980 000 ₽</p>
        </div>

        {/* Card chips */}
        <div
          className={['mt-3 flex items-center gap-2 transition-base', dim('chips'), ring('chips')].join(' ')}
          style={ringStyle('chips')}
        >
          <span
            className="flex h-11 w-16 items-end rounded-xl p-2 text-[11px] font-medium"
            style={{
              background: `linear-gradient(135deg, ${APP.brand}, ${APP.brandSoft})`,
            }}
          >
            3567
          </span>
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: APP.surface, color: APP.textDim }}
          >
            <Plus size={18} />
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div
        className={['relative z-10 mt-4 flex justify-between gap-2 transition-base', dim('actions'), ring('actions')].join(' ')}
        style={ringStyle('actions')}
      >
        {[
          { icon: CreditCard, label: 'Оплатить' },
          { icon: Plus, label: 'Пополнить' },
          { icon: ArrowLeftRight, label: 'Перевести' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-1 flex-col items-center gap-2 rounded-2xl py-3"
            style={{ background: APP.surface }}
          >
            <Icon size={18} style={{ color: APP.textDim }} />
            <span className="text-[11px]" style={{ color: APP.textDim }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Promo */}
      <div
        className={['relative z-10 mt-4 overflow-hidden rounded-2xl p-4 transition-base', dim('promo'), ring('promo')].join(' ')}
        style={{
          background: `linear-gradient(120deg, ${APP.brand}, ${APP.brandSoft})`,
          ...ringStyle('promo'),
        }}
      >
        <p className="max-w-[70%] text-[15px] font-bold leading-tight">
          Откройте вклад с увеличенной ставкой до 18%
        </p>
      </div>

      {/* Bonuses title */}
      <p
        className={['relative z-10 mt-5 text-[13px] font-medium transition-base', dim('bonusTitle')].join(' ')}
        style={{ color: APP.textDim }}
      >
        Бонусы по карте
      </p>

      {/* Bonuses */}
      <div
        className={['relative z-10 mt-3 grid grid-cols-2 gap-3 transition-base', dim('bonuses'), ring('bonuses')].join(' ')}
        style={ringStyle('bonuses')}
      >
        {[
          { icon: Utensils, text: 'Кэшбэк за бронирование ресторанов' },
          { icon: Hotel, text: 'Кэшбэк за бронирование туров и отелей' },
        ].map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex flex-col items-center gap-3 rounded-2xl p-3 text-center"
            style={{ background: APP.surface }}
          >
            <span className="text-[11px] font-medium leading-tight">{text}</span>
            <span className="text-[10px]" style={{ color: APP.textDim }}>
              5%
            </span>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: APP.accent }}
            >
              <Icon size={16} className="text-white" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Column + side-margin guides drawn over the screen for the 'grid' layer. */
function GridOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 px-4">
      <div className="relative h-full w-full">
        {/* Side margin bands (the 16px padding gutters) */}
        <span className="absolute -left-4 top-0 h-full w-4" style={{ background: `${APP.brand}22` }} />
        <span className="absolute -right-4 top-0 h-full w-4" style={{ background: `${APP.brand}22` }} />
        {/* 4 content columns */}
        <div className="grid h-full grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="h-full rounded-sm" style={{ background: `${APP.brand}14` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScreenWalkthrough() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  const StepIcon = step.icon;

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[640px] text-footnote text-secondary">
        Один экран разбираем по слоям — как это делает ментор: сначала «что видишь?», потом сетка,
        блоки, выравнивание, цвет, скругления и бары. Экран приглушается, подсвечивая только то, что
        относится к текущему слою.
      </p>

      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* LEFT — the reference screen */}
        <div className="flex justify-center lg:justify-start">
          <BankScreen step={step} />
        </div>

        {/* RIGHT — layer rail + active layer detail */}
        <div className="flex flex-col gap-5">
          {/* Layer rail */}
          <div className="flex flex-wrap gap-1.5">
            {STEPS.map((s, i) => {
              const active = i === idx;
              const done = i < idx;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={[
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-medium transition-fast',
                    active
                      ? 'border-brand bg-brand/10 text-brand'
                      : done
                        ? 'border-border bg-muted text-secondary'
                        : 'border-border bg-surface text-tertiary hover:text-secondary',
                  ].join(' ')}
                >
                  <Icon size={13} />
                  {s.layer}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-base"
              style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Active layer detail */}
          <div className="rounded-xl border border-border bg-elevated p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <StepIcon size={16} />
              </span>
              <div>
                <span className="block text-caption text-tertiary">
                  Слой {idx + 1} из {STEPS.length} · {step.layer}
                </span>
                <span className="block text-callout font-semibold text-primary">{step.title}</span>
              </div>
            </div>
            <p className="text-body text-secondary">{step.body}</p>
            {step.id === 'see' && (
              <div className="mt-4 border-t border-border pt-4">
                <ObservePanel />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="rounded-lg border border-border px-4 py-2 text-footnote font-medium text-secondary transition-fast hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Назад
            </button>
            {idx < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                className="rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90"
              >
                Следующий слой
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIdx(0)}
                className="rounded-lg border border-border px-4 py-2 text-footnote font-medium text-secondary transition-fast hover:bg-hover"
              >
                Сначала
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
