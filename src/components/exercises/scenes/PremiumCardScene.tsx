'use client';

import {
  ArrowLeft,
  Settings2,
  CreditCard,
  Plus,
  ArrowLeftRight,
  Utensils,
  Hotel,
  Check,
  CircleHelp,
  Lightbulb,
} from 'lucide-react';
import type { Verdict } from '@/lib/curriculum/screenCritique';
import { useT } from '@/lib/i18n/client';

/**
 * The built-in "Премиум карта" scene for screen-critique. Every zone renders a
 * deliberately BROKEN variant by default and a repaired variant once its id is
 * in `fixed` — so as the learner picks correct fixes, the screen morphs from the
 * bad version toward the good one. Also handles zone selection + post-check
 * verdict outlines/badges.
 */

const APP = {
  bg: '#0E1013',
  surface: '#181B20',
  text: '#F4F5F7',
  textDim: '#9BA1AC',
  brand: '#7B61FF',
  brandSoft: '#4B3FA8',
  accent: '#F2913D',
};

const VERDICT_RING: Record<Verdict, string> = {
  right: '#3FB950',
  debatable: '#E3B341',
  wrong: '#E0785F',
};
const VERDICT_ICON: Record<Verdict, typeof Check> = {
  right: Check,
  debatable: CircleHelp,
  wrong: Lightbulb,
};

export function PremiumCardScene({
  fixed,
  selected,
  onSelect,
  verdicts,
  checked = false,
  interactive = true,
}: {
  fixed: Set<string>;
  selected: string | null;
  onSelect?: (id: string) => void;
  /** zoneId → worst verdict, shown after check. */
  verdicts?: Record<string, Verdict | undefined>;
  checked?: boolean;
  interactive?: boolean;
}) {
  const { t } = useT();
  const isFixed = (id: string) => fixed.has(id);

  const zoneStyle = (id: string): React.CSSProperties => {
    const wv = verdicts?.[id];
    if (checked && wv) {
      return { outline: `2px solid ${VERDICT_RING[wv]}`, outlineOffset: 3, borderRadius: 'inherit' };
    }
    if (!checked && selected === id) {
      return { outline: `2px solid ${APP.brand}`, outlineOffset: 3, borderRadius: 'inherit' };
    }
    return {};
  };

  const cls = () =>
    ['relative z-10 transition-base', interactive && !checked ? 'cursor-pointer' : 'cursor-default'].join(
      ' ',
    );
  const handle = (id: string) => (interactive && !checked && onSelect ? () => onSelect(id) : undefined);

  const Badge = ({ id }: { id: string }) => {
    const wv = verdicts?.[id];
    if (!checked || !wv) return null;
    const Icon = VERDICT_ICON[wv];
    return (
      <span
        className="absolute -right-2 -top-2 z-30 flex h-5 w-5 items-center justify-center rounded-full"
        style={{ background: VERDICT_RING[wv] }}
      >
        <Icon size={12} className="text-white" strokeWidth={3} />
      </span>
    );
  };

  return (
    <div
      className="relative w-[300px] shrink-0 overflow-visible rounded-[36px] p-4 shadow-lg"
      style={{ background: APP.bg, color: APP.text }}
    >
      {/* Top bar — DEFECT alignment: settings icon nudged down. */}
      <div className={cls()} style={zoneStyle('topbar')} onClick={handle('topbar')}>
        <Badge id="topbar" />
        <div className="flex items-start justify-between">
          <ArrowLeft size={20} />
          <Settings2 size={18} style={{ color: APP.textDim, marginTop: isFixed('topbar') ? 0 : 7 }} />
        </div>
      </div>

      {/* Card header — DEFECT hierarchy: balance small/dim/off-margin. */}
      <div className={['mt-5', cls()].join(' ')} style={zoneStyle('header')} onClick={handle('header')}>
        <Badge id="header" />
        <div className={['flex justify-between', isFixed('header') ? 'items-baseline' : 'items-start'].join(' ')}>
          <div>
            <p className="text-[11px]" style={{ color: APP.textDim }}>
              {t('exercises.premiumCard.cardName')}
            </p>
            <p className="text-[15px] font-semibold">{t('exercises.premiumCard.cardTitle')}</p>
          </div>
          {isFixed('header') ? (
            <p className="text-[20px] font-semibold tabular-nums" style={{ color: APP.text }}>
              980 000 ₽
            </p>
          ) : (
            <p className="mr-3 mt-3 text-[13px] font-normal tabular-nums" style={{ color: APP.textDim }}>
              980 000 ₽
            </p>
          )}
        </div>
      </div>

      {/* Card chips — DEFECT radius: card almost square next to pill. */}
      <div
        className={['mt-3 flex items-center gap-2', cls()].join(' ')}
        style={zoneStyle('chips')}
        onClick={handle('chips')}
      >
        <Badge id="chips" />
        <span
          className={[
            'flex h-11 w-16 items-end p-2 text-[11px] font-medium',
            isFixed('chips') ? 'rounded-2xl' : 'rounded-sm',
          ].join(' ')}
          style={{ background: `linear-gradient(135deg, ${APP.brand}, ${APP.brandSoft})` }}
        >
          3567
        </span>
        <span
          className={[
            'flex h-11 w-11 items-center justify-center',
            isFixed('chips') ? 'rounded-2xl' : 'rounded-full',
          ].join(' ')}
          style={{ background: APP.surface, color: APP.textDim }}
        >
          <Plus size={18} />
        </span>
      </div>

      {/* Quick actions — DEFECT radius: 3 tiles, different radii + uneven gaps. */}
      <div
        className={['mt-4 flex justify-between', cls()].join(' ')}
        style={zoneStyle('actions')}
        onClick={handle('actions')}
      >
        <Badge id="actions" />
        {[
          { icon: CreditCard, label: t('exercises.premiumCard.payAction'), radius: 'rounded-2xl', ml: 0 },
          { icon: Plus, label: t('exercises.premiumCard.topupAction'), radius: 'rounded-none', ml: 6 },
          { icon: ArrowLeftRight, label: t('exercises.premiumCard.transferAction'), radius: 'rounded-full', ml: 14 },
        ].map(({ icon: Icon, label, radius, ml }) => (
          <div
            key={label}
            className={[
              'flex flex-1 flex-col items-center gap-2 py-3',
              isFixed('actions') ? 'rounded-2xl' : radius,
            ].join(' ')}
            style={{ background: APP.surface, marginLeft: isFixed('actions') ? 0 : ml }}
          >
            <Icon size={18} style={{ color: APP.textDim }} />
            <span className="text-[11px]" style={{ color: APP.textDim }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Promo — DEFECT contrast: title barely readable on purple. */}
      <div
        className={['mt-4 overflow-hidden rounded-2xl', cls(), isFixed('promo') ? 'p-4' : 'p-2'].join(' ')}
        style={{
          background: `linear-gradient(120deg, ${APP.brand}, ${APP.brandSoft})`,
          ...zoneStyle('promo'),
        }}
        onClick={handle('promo')}
      >
        <Badge id="promo" />
        <p
          className="max-w-[70%] text-[15px] font-bold leading-tight"
          style={{ color: isFixed('promo') ? '#FFFFFF' : 'rgba(255,255,255,0.42)' }}
        >
          {t('exercises.premiumCard.promo')}
        </p>
      </div>

      {/* Bonuses — DEFECT consistency: two cards styled differently. */}
      <p
        className="relative z-10 mt-3 font-normal"
        style={{ color: APP.textDim, fontSize: isFixed('bonuses') ? 12 : 10 }}
      >
        {t('exercises.premiumCard.bonusesTitle')}
      </p>
      <div
        className={['mt-3 grid grid-cols-2 gap-3 items-start', cls()].join(' ')}
        style={zoneStyle('bonuses')}
        onClick={handle('bonuses')}
      >
        <Badge id="bonuses" />
        {[
          { icon: Utensils, text: t('exercises.premiumCard.bonusRestaurants'), pct: '5%' },
          { icon: Hotel, text: t('exercises.premiumCard.bonusHotels'), pct: '5%' },
        ].map(({ icon: Icon, text, pct }, i) => {
          // Broken: second card has tight padding, small radius, and no percent.
          const broken = !isFixed('bonuses') && i === 1;
          return (
            <div
              key={text}
              className={[
                'flex flex-col items-center gap-3 text-center',
                broken ? 'p-1.5 rounded-md' : 'p-3 rounded-2xl',
              ].join(' ')}
              style={{ background: APP.surface }}
            >
              <span className="text-[11px] font-medium leading-tight">{text}</span>
              {!broken && (
                <span className="text-[10px]" style={{ color: APP.textDim }}>
                  {pct}
                </span>
              )}
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: APP.accent }}
              >
                <Icon size={16} className="text-white" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
