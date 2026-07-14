'use client';

import { useMemo, useState } from 'react';
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
  X,
  RotateCcw,
  Tag,
} from 'lucide-react';

/**
 * Screen-critique — the INVERSE of screen-walkthrough. Instead of the mentor
 * narrating each layer, the learner does the diagnosis: they click a region of
 * a real reference screen and assign it a ROLE from the palette on the right
 * ("главный акцент", "реклама — не часть карты", "второстепенное", …), and can
 * optionally write what they'd change. "Проверить" then grades every assignment
 * against ground truth in THREE states — because design is subjective:
 *   • верно  (green)  — matches the strongest reading
 *   • спорно (yellow) — a defensible-but-not-only-right reading; mentor explains
 *   • мимо   (red)    — breaks the hierarchy / misreads the screen
 * Self-contained prototype rendered in /design-system, mirroring the same dark
 * banking "Премиум карта" screen so the two genres sit side by side.
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

type Region = 'topbar' | 'header' | 'actions' | 'chips' | 'promo' | 'bonuses';
type RoleId = 'accent' | 'secondary' | 'promo' | 'neutral' | 'nav';
type Verdict = 'right' | 'debatable' | 'wrong';

interface Role {
  id: RoleId;
  label: string;
  hint: string;
}

const ROLES: Role[] = [
  { id: 'accent', label: 'Главный акцент', hint: 'то, ради чего экран — ловит взгляд первым' },
  { id: 'secondary', label: 'Второстепенное', hint: 'нужное, но не борется за внимание' },
  { id: 'promo', label: 'Реклама, не часть карты', hint: 'продающий блок, живёт отдельно от продукта' },
  { id: 'neutral', label: 'Нейтральный фон', hint: 'поверхность/обрамление, не несёт смысла само по себе' },
  { id: 'nav', label: 'Навигация', hint: 'вход/выход, обрамляет экран' },
];

interface Truth {
  correct: RoleId;
  /** defensible-but-not-only-right readings → yellow "спорно". */
  debatable: RoleId[];
  /** what a mentor says for a debatable pick, and why the correct one is stronger. */
  note: string;
}

const TRUTH: Record<Region, Truth> = {
  topbar: {
    correct: 'nav',
    debatable: ['neutral'],
    note: 'Топ-бар и правда почти нейтрален — но у него есть работа: вход назад и настройки. Это навигация, а не просто фон.',
  },
  header: {
    correct: 'accent',
    debatable: [],
    note: 'Баланс 980 000 ₽ — то, ради чего открывают экран. Это главный акцент, спорить тут почти не с чем.',
  },
  chips: {
    correct: 'secondary',
    debatable: ['neutral'],
    note: 'Чипы карты — второстепенное: они нужны, но не тянут взгляд. Назвать их «нейтральным фоном» можно, но у них есть смысл (номер, добавить).',
  },
  actions: {
    correct: 'secondary',
    debatable: ['neutral'],
    note: 'Быстрые действия — важное второстепенное. Как «нейтральный фон» их видеть можно (серые плитки), но по функции это ядро сценария.',
  },
  promo: {
    correct: 'promo',
    debatable: ['accent'],
    note: 'Промо-вклад — реклама, живёт отдельно от карты. Назвать его «главным акцентом» защитимо — он яркий и продаёт — но это НЕ то, ради чего пришёл пользователь.',
  },
  bonuses: {
    correct: 'secondary',
    debatable: ['promo'],
    note: 'Бонусы — второстепенная выгода по карте. Близко к «рекламе», но это свойство продукта, а не отдельный баннер.',
  },
};

const REGION_TITLE: Record<Region, string> = {
  topbar: 'Топ-бар',
  header: 'Шапка с балансом',
  chips: 'Чипы карты',
  actions: 'Быстрые действия',
  promo: 'Промо-вклад',
  bonuses: 'Бонусы',
};

type Assignments = Partial<Record<Region, RoleId>>;
type Fixes = Partial<Record<Region, string>>;

function grade(region: Region, role: RoleId): Verdict {
  const t = TRUTH[region];
  if (role === t.correct) return 'right';
  if (t.debatable.includes(role)) return 'debatable';
  return 'wrong';
}

const VERDICT_UI: Record<
  Verdict,
  { ring: string; label: string; icon: typeof Check; text: string; bg: string }
> = {
  right: { ring: '#3FB950', label: 'Верно', icon: Check, text: 'text-[#3FB950]', bg: 'bg-[#3FB950]/10' },
  debatable: { ring: '#E3B341', label: 'Спорно', icon: CircleHelp, text: 'text-[#E3B341]', bg: 'bg-[#E3B341]/10' },
  wrong: { ring: '#F85149', label: 'Мимо', icon: X, text: 'text-[#F85149]', bg: 'bg-[#F85149]/10' },
};

export function ScreenCritique() {
  const [assignments, setAssignments] = useState<Assignments>({});
  const [fixes, setFixes] = useState<Fixes>({});
  const [selected, setSelected] = useState<Region | null>(null);
  const [checked, setChecked] = useState(false);

  const verdicts = useMemo(() => {
    if (!checked) return {} as Record<Region, Verdict>;
    const out = {} as Record<Region, Verdict>;
    (Object.keys(assignments) as Region[]).forEach((r) => {
      const role = assignments[r];
      if (role) out[r] = grade(r, role);
    });
    return out;
  }, [checked, assignments]);

  const assignedCount = Object.keys(assignments).length;

  function assignRole(role: RoleId) {
    if (!selected) return;
    setAssignments((a) => ({ ...a, [selected]: role }));
  }

  function reset() {
    setAssignments({});
    setFixes({});
    setSelected(null);
    setChecked(false);
  }

  const summary = useMemo(() => {
    const vals = Object.values(verdicts);
    return {
      right: vals.filter((v) => v === 'right').length,
      debatable: vals.filter((v) => v === 'debatable').length,
      wrong: vals.filter((v) => v === 'wrong').length,
    };
  }, [verdicts]);

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[640px] text-footnote text-secondary">
        Теперь диагноз ставишь ты. Кликни зону на экране и повесь на неё роль из палитры справа — что
        это по смыслу: главный акцент, второстепенное, реклама или фон. Можно дописать, что бы ты
        здесь поправил. Потом «Проверить»: дизайн субъективен, поэтому оценка в трёх цветах —
        зелёный «верно», жёлтый «спорно, но защитимо», красный «мимо».
      </p>

      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* LEFT — interactive screen */}
        <div className="flex justify-center lg:justify-start">
          <CritiqueScreen
            selected={selected}
            onSelect={setSelected}
            assignments={assignments}
            verdicts={verdicts}
            checked={checked}
          />
        </div>

        {/* RIGHT — role palette + per-region panel + results */}
        <div className="flex flex-col gap-5">
          {!checked ? (
            <>
              {/* Selected region + role palette */}
              <div className="rounded-xl border border-border bg-elevated p-5">
                {selected ? (
                  <>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <Tag size={16} />
                      </span>
                      <div>
                        <span className="block text-caption text-tertiary">Выбрана зона</span>
                        <span className="block text-callout font-semibold text-primary">
                          {REGION_TITLE[selected]}
                        </span>
                      </div>
                    </div>
                    <p className="mb-3 text-caption text-tertiary">Какая это роль на экране?</p>
                    <div className="flex flex-col gap-2">
                      {ROLES.map((role) => {
                        const active = assignments[selected] === role.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => assignRole(role.id)}
                            className={[
                              'flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-fast',
                              active
                                ? 'border-brand bg-brand/10'
                                : 'border-border bg-surface hover:border-brand/40',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'text-footnote font-medium',
                                active ? 'text-brand' : 'text-primary',
                              ].join(' ')}
                            >
                              {role.label}
                            </span>
                            <span className="text-caption text-tertiary">{role.hint}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Optional fix note */}
                    <div className="mt-4 border-t border-border pt-4">
                      <label className="mb-2 block text-caption text-tertiary">
                        Что бы ты здесь поправил? (необязательно)
                      </label>
                      <textarea
                        value={fixes[selected] ?? ''}
                        onChange={(e) =>
                          setFixes((f) => ({ ...f, [selected]: e.target.value }))
                        }
                        rows={2}
                        placeholder="Например: слишком крупный радиус, конкурирует с картой…"
                        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Tag size={18} />
                    </span>
                    <p className="text-footnote text-secondary">
                      Кликни любую зону на экране слева, чтобы повесить на неё роль.
                    </p>
                  </div>
                )}
              </div>

              {/* Assigned chips */}
              {assignedCount > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(assignments) as Region[]).map((r) => {
                    const role = ROLES.find((x) => x.id === assignments[r])!;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelected(r)}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-caption text-secondary transition-fast hover:border-brand/40"
                      >
                        <span className="font-medium text-primary">{REGION_TITLE[r]}</span>
                        <span className="text-tertiary">→ {role.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-caption text-tertiary">
                  Размечено зон: {assignedCount} из 6
                </span>
                <button
                  type="button"
                  onClick={() => setChecked(true)}
                  disabled={assignedCount === 0}
                  className="rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Проверить
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Summary */}
              <div className="flex flex-wrap gap-2">
                {(['right', 'debatable', 'wrong'] as Verdict[]).map((v) => {
                  const ui = VERDICT_UI[v];
                  const Icon = ui.icon;
                  return (
                    <div
                      key={v}
                      className={['flex items-center gap-2 rounded-lg px-3 py-2', ui.bg].join(' ')}
                    >
                      <Icon size={15} className={ui.text} />
                      <span className={['text-footnote font-semibold', ui.text].join(' ')}>
                        {summary[v]} · {ui.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Per-region verdicts */}
              <div className="flex flex-col gap-2">
                {(Object.keys(verdicts) as Region[]).map((r) => {
                  const v = verdicts[r];
                  const ui = VERDICT_UI[v];
                  const Icon = ui.icon;
                  const role = ROLES.find((x) => x.id === assignments[r])!;
                  const t = TRUTH[r];
                  const correctRole = ROLES.find((x) => x.id === t.correct)!;
                  return (
                    <div
                      key={r}
                      className="rounded-xl border border-border bg-elevated p-4"
                      style={{ borderLeft: `3px solid ${ui.ring}` }}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Icon size={15} className={ui.text} />
                        <span className="text-footnote font-semibold text-primary">
                          {REGION_TITLE[r]}
                        </span>
                        <span className={['ml-auto text-caption font-medium', ui.text].join(' ')}>
                          {ui.label}
                        </span>
                      </div>
                      <p className="text-caption text-tertiary">
                        Твой выбор: <span className="text-secondary">{role.label}</span>
                        {v !== 'right' && (
                          <>
                            {' '}
                            · сильное прочтение:{' '}
                            <span className="text-secondary">{correctRole.label}</span>
                          </>
                        )}
                      </p>
                      {v !== 'right' && (
                        <p className="mt-1.5 text-footnote text-secondary">{t.note}</p>
                      )}
                      {fixes[r]?.trim() && (
                        <p className="mt-1.5 text-caption text-tertiary">
                          Твоя правка: «{fixes[r]}»
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 self-start rounded-lg border border-border px-4 py-2 text-footnote font-medium text-secondary transition-fast hover:bg-hover"
              >
                <RotateCcw size={15} />
                Пройти заново
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** The reference phone with clickable regions. */
function CritiqueScreen({
  selected,
  onSelect,
  assignments,
  verdicts,
  checked,
}: {
  selected: Region | null;
  onSelect: (r: Region) => void;
  assignments: Assignments;
  verdicts: Record<Region, Verdict>;
  checked: boolean;
}) {
  // Ring colour for a region: verdict colour after check, brand while selecting.
  const regionStyle = (r: Region): React.CSSProperties => {
    if (checked && verdicts[r]) {
      return { outline: `2px solid ${VERDICT_UI[verdicts[r]].ring}`, outlineOffset: 3, borderRadius: 'inherit' };
    }
    if (!checked && selected === r) {
      return { outline: `2px solid ${APP.brand}`, outlineOffset: 3, borderRadius: 'inherit' };
    }
    if (!checked && assignments[r]) {
      return { outline: `1.5px dashed ${APP.textDim}`, outlineOffset: 3, borderRadius: 'inherit' };
    }
    return {};
  };

  const cls = (r: Region) =>
    [
      'relative z-10 transition-base',
      !checked ? 'cursor-pointer' : 'cursor-default',
    ].join(' ');

  const handle = (r: Region) => (checked ? undefined : () => onSelect(r));

  // Small corner badge showing the assigned role's verdict after check.
  const Badge = ({ r }: { r: Region }) => {
    if (!checked || !verdicts[r]) return null;
    const ui = VERDICT_UI[verdicts[r]];
    const Icon = ui.icon;
    return (
      <span
        className="absolute -right-2 -top-2 z-30 flex h-5 w-5 items-center justify-center rounded-full"
        style={{ background: ui.ring }}
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
      {/* Top bar */}
      <div className={cls('topbar')} style={regionStyle('topbar')} onClick={handle('topbar')}>
        <Badge r="topbar" />
        <div className="flex items-center justify-between">
          <ArrowLeft size={20} />
          <Settings2 size={18} style={{ color: APP.textDim }} />
        </div>
      </div>

      {/* Card header */}
      <div className={['mt-5', cls('header')].join(' ')} style={regionStyle('header')} onClick={handle('header')}>
        <Badge r="header" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px]" style={{ color: APP.textDim }}>
              Название карты
            </p>
            <p className="text-[15px] font-semibold">Премиум карта</p>
          </div>
          <p className="text-[15px] font-semibold tabular-nums">980 000 ₽</p>
        </div>
      </div>

      {/* Card chips */}
      <div
        className={['mt-3 flex items-center gap-2', cls('chips')].join(' ')}
        style={regionStyle('chips')}
        onClick={handle('chips')}
      >
        <Badge r="chips" />
        <span
          className="flex h-11 w-16 items-end rounded-xl p-2 text-[11px] font-medium"
          style={{ background: `linear-gradient(135deg, ${APP.brand}, ${APP.brandSoft})` }}
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

      {/* Quick actions */}
      <div
        className={['mt-4 flex justify-between gap-2', cls('actions')].join(' ')}
        style={regionStyle('actions')}
        onClick={handle('actions')}
      >
        <Badge r="actions" />
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
        className={['mt-4 overflow-hidden rounded-2xl p-4', cls('promo')].join(' ')}
        style={{
          background: `linear-gradient(120deg, ${APP.brand}, ${APP.brandSoft})`,
          ...regionStyle('promo'),
        }}
        onClick={handle('promo')}
      >
        <Badge r="promo" />
        <p className="max-w-[70%] text-[15px] font-bold leading-tight">
          Откройте вклад с увеличенной ставкой до 18%
        </p>
      </div>

      {/* Bonuses */}
      <p className="relative z-10 mt-5 text-[13px] font-medium" style={{ color: APP.textDim }}>
        Бонусы по карте
      </p>
      <div
        className={['mt-3 grid grid-cols-2 gap-3', cls('bonuses')].join(' ')}
        style={regionStyle('bonuses')}
        onClick={handle('bonuses')}
      >
        <Badge r="bonuses" />
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
