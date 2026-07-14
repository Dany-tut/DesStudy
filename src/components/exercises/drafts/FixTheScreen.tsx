'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Clock,
  Home,
  ClipboardList,
  MessageCircle,
  GraduationCap,
} from 'lucide-react';

/**
 * Fix-the-screen — the learner repairs a deliberately broken mobile mockup by
 * picking the correct fix for each flagged defect. A reference "how it should
 * look" screen sits alongside the whole time. The preview is rendered purely
 * from `fixes` state, so every defect maps to one deterministic correct choice.
 */

type DefectKey = 'radius' | 'chevron' | 'navActive' | 'pillColor' | 'gap' | 'cta';

interface Option {
  id: string;
  label: string;
  correct?: boolean;
  /** Shown when this wrong option is picked — gentle, specific nudge. */
  feedback?: string;
}

interface Defect {
  key: DefectKey;
  title: string;
  hint: string;
  options: Option[];
}

const DEFECTS: Defect[] = [
  {
    key: 'radius',
    title: 'Скругление карточек и полей',
    hint: 'Углы почти прямые — макет выглядит резко и дёшево.',
    options: [
      { id: 'sm', label: 'rounded-sm · 4px' },
      { id: 'md', label: 'rounded-lg · 8px', feedback: 'Уже лучше, но в этом макете карточки заметно круглее.' },
      { id: 'xl', label: 'rounded-2xl · 16px', correct: true },
    ],
  },
  {
    key: 'chevron',
    title: 'Иконка в дропдауне',
    hint: 'Стоит стрелка «вправо» — она читается как переход, а не как раскрытие списка.',
    options: [
      { id: 'right', label: 'ChevronRight  ›' },
      { id: 'down', label: 'ChevronDown  ⌄', correct: true },
    ],
  },
  {
    key: 'navActive',
    title: 'Активный таб в нав-баре',
    hint: 'Ни один пункт не выделен — непонятно, где ты находишься.',
    options: [
      { id: 'none', label: 'Без выделения' },
      { id: 'all', label: 'Подсветить все', feedback: 'Тогда «активно» всё сразу — сигнал теряется.' },
      { id: 'home', label: 'Выделить Home', correct: true },
    ],
  },
  {
    key: 'pillColor',
    title: 'Цвет чипов категорий',
    hint: 'Чипы залиты произвольным серым вместо токена бренда.',
    options: [
      { id: 'gray', label: 'Случайный #9AA0A6' },
      { id: 'brand', label: 'bg-brand / токен', correct: true },
    ],
  },
  {
    key: 'gap',
    title: 'Отступы между блоками',
    hint: 'Поля слиплись — нет единого ритма вертикали (auto-layout gap).',
    options: [
      { id: 'tight', label: 'gap 4px, вразнобой' },
      { id: 'even', label: 'gap 16px, единый', correct: true },
    ],
  },
  {
    key: 'cta',
    title: 'Главная кнопка',
    hint: 'Кнопка узкая и прижата влево — не выглядит как основное действие.',
    options: [
      { id: 'inline', label: 'По контенту, слева' },
      { id: 'full', label: 'Full-width, снизу', correct: true },
    ],
  },
];

/** Starting (broken) selection — the first, wrong option of each defect. */
const INITIAL_FIXES: Record<DefectKey, string> = DEFECTS.reduce(
  (acc, d) => ({ ...acc, [d.key]: d.options[0].id }),
  {} as Record<DefectKey, string>,
);

const CATEGORIES = ['Class', 'Exam', 'Lab', 'Assignment'];

/** The phone mockup, rendered entirely from a fixes map. */
function PhonePreview({
  fixes,
  highlight,
  faded = false,
}: {
  fixes: Record<DefectKey, string>;
  highlight?: DefectKey | null;
  faded?: boolean;
}) {
  const cardRadius =
    fixes.radius === 'xl' ? 'rounded-2xl' : fixes.radius === 'md' ? 'rounded-lg' : 'rounded-[4px]';
  const blockGap = fixes.gap === 'even' ? 'gap-4' : 'gap-1';
  const pillOn = fixes.pillColor === 'brand';
  const ctaFull = fixes.cta === 'full';

  const ring = (key: DefectKey) =>
    highlight === key ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : '';

  return (
    <div
      className={[
        'flex h-full flex-col rounded-[28px] border border-border bg-surface p-4 shadow-sm transition-base',
        faded ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <ArrowLeft size={18} className="text-primary" />
      </div>
      <h4 className="mt-3 text-title-3 font-bold text-primary">Add a task</h4>

      <div className={['mt-4 flex flex-col', blockGap, ring('gap')].join(' ')}>
        {/* Category chips */}
        <div className={['flex flex-wrap gap-2 rounded-md p-0.5', ring('pillColor')].join(' ')}>
          {CATEGORIES.map((c, i) => (
            <span
              key={c}
              className={[
                'rounded-full px-3 py-1 text-caption font-semibold transition-fast',
                pillOn
                  ? i % 2 === 0
                    ? 'bg-brand text-on-brand'
                    : 'bg-brand/15 text-brand'
                  : 'text-white',
              ].join(' ')}
              style={pillOn ? undefined : { backgroundColor: '#9AA0A6' }}
            >
              {c}
            </span>
          ))}
        </div>

        {/* Dropdown */}
        <div
          className={[
            'flex items-center justify-between border border-border bg-elevated px-3 py-2.5',
            cardRadius,
            ring('radius'),
            highlight === 'chevron' ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : '',
          ].join(' ')}
        >
          <span className="text-footnote text-secondary">Biology</span>
          {fixes.chevron === 'down' ? (
            <ChevronDown size={16} className="text-tertiary" />
          ) : (
            <ChevronRight size={16} className="text-tertiary" />
          )}
        </div>

        {/* Text field */}
        <div className={['border border-border bg-elevated px-3 py-2.5', cardRadius].join(' ')}>
          <span className="text-footnote text-tertiary">Topic / Chapter Name</span>
        </div>

        {/* Date + time rows */}
        <div className="flex items-center gap-2">
          <div className={['grid h-9 w-9 place-items-center bg-brand/15', cardRadius].join(' ')}>
            <Calendar size={16} className="text-brand" />
          </div>
          <span className="text-footnote text-secondary">Fri 25, September</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={['grid h-9 w-9 place-items-center bg-brand/15', cardRadius].join(' ')}>
            <Clock size={16} className="text-brand" />
          </div>
          <span className="text-footnote text-secondary">09:30 AM</span>
        </div>
      </div>

      {/* CTA */}
      <div className={['mt-4', ctaFull ? '' : 'flex justify-start', ring('cta')].join(' ')}>
        <button
          type="button"
          className={[
            'bg-success py-2.5 text-center text-footnote font-semibold text-on-brand',
            cardRadius,
            ctaFull ? 'w-full' : 'px-4',
          ].join(' ')}
        >
          Add Task
        </button>
      </div>

      {/* Nav bar */}
      <div
        className={[
          'mt-4 flex items-center justify-around rounded-2xl bg-elevated py-2',
          ring('navActive'),
        ].join(' ')}
      >
        {[
          { icon: Home, key: 'home' },
          { icon: ClipboardList, key: 'tasks' },
          { icon: GraduationCap, key: 'class' },
          { icon: MessageCircle, key: 'chat' },
        ].map(({ icon: Icon, key }) => {
          const active =
            fixes.navActive === 'all' ||
            (fixes.navActive === 'home' && key === 'home');
          return (
            <Icon
              key={key}
              size={18}
              className={active ? 'text-brand' : 'text-tertiary'}
              strokeWidth={active ? 2.4 : 1.8}
            />
          );
        })}
      </div>
    </div>
  );
}

export function FixTheScreen() {
  const [fixes, setFixes] = useState<Record<DefectKey, string>>(INITIAL_FIXES);
  const [active, setActive] = useState<DefectKey>(DEFECTS[0].key);
  // Wrong-pick feedback per defect (cleared when corrected).
  const [wrong, setWrong] = useState<Partial<Record<DefectKey, string>>>({});

  const fixedCount = useMemo(
    () => DEFECTS.filter((d) => d.options.find((o) => o.id === fixes[d.key])?.correct).length,
    [fixes],
  );
  const allFixed = fixedCount === DEFECTS.length;

  function choose(defect: Defect, option: Option) {
    setFixes((prev) => ({ ...prev, [defect.key]: option.id }));
    setWrong((prev) => {
      const next = { ...prev };
      if (option.correct) delete next[defect.key];
      else next[defect.key] = option.feedback ?? 'Не то — сверься с эталоном справа.';
      return next;
    });
  }

  function reset() {
    setFixes(INITIAL_FIXES);
    setWrong({});
    setActive(DEFECTS[0].key);
  }

  const activeDefect = DEFECTS.find((d) => d.key === active)!;

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-5 sm:rounded-2xl lg:rounded-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-callout font-semibold text-primary">Почини экран</h3>
          <p className="mt-1 text-footnote text-secondary">
            Слева — как было (сломанный макет). Проходи по нарушениям и выбирай правильное
            исправление — по центру «твой экран» меняется на глазах.
          </p>
        </div>
        <span
          className={[
            'shrink-0 rounded-full px-3 py-1 text-caption font-semibold tabular-nums',
            allFixed ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          {fixedCount}/{DEFECTS.length}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
        {/* LEFT — the original broken screen, frozen as the "before" reference. */}
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium text-tertiary">Было</span>
          <PhonePreview fixes={INITIAL_FIXES} highlight={allFixed ? null : active} faded />
        </div>

        {/* MIDDLE — the learner's screen: starts identical (broken) and updates
            live as each fix is applied. */}
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium text-tertiary">Твой экран</span>
          <PhonePreview fixes={fixes} highlight={allFixed ? null : active} />
        </div>

        {/* RIGHT — defect list + options */}
        <div className="flex flex-col gap-4">
          {/* Progress */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={['h-full rounded-full transition-base', allFixed ? 'bg-success' : 'bg-brand'].join(' ')}
              style={{ width: `${(fixedCount / DEFECTS.length) * 100}%` }}
            />
          </div>

          {/* Defect tabs */}
          <div className="flex flex-col gap-1.5">
            {DEFECTS.map((d) => {
              const done = d.options.find((o) => o.id === fixes[d.key])?.correct;
              const on = active === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setActive(d.key)}
                  className={[
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-fast',
                    on ? 'border-brand bg-brand/5' : 'border-border bg-elevated hover:bg-hover',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                      done ? 'border-success bg-success' : 'border-border-strong',
                    ].join(' ')}
                  >
                    {done && <Check size={11} strokeWidth={3} className="text-on-brand" />}
                  </span>
                  <span className={['text-footnote', done ? 'text-secondary line-through' : 'text-primary'].join(' ')}>
                    {d.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active defect detail */}
          {!allFixed && (
            <div className="rounded-lg border border-border bg-elevated p-4">
              <p className="text-footnote font-semibold text-primary">{activeDefect.title}</p>
              <p className="mt-1 text-caption text-secondary">{activeDefect.hint}</p>
              <div className="mt-3 flex flex-col gap-2">
                {activeDefect.options.map((o) => {
                  const picked = fixes[activeDefect.key] === o.id;
                  const isCorrectPick = picked && o.correct;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => choose(activeDefect, o)}
                      className={[
                        'flex items-center justify-between rounded-md border px-3 py-2 text-footnote transition-fast',
                        isCorrectPick
                          ? 'border-success bg-success/10 text-success'
                          : picked
                            ? 'border-danger bg-danger/10 text-danger'
                            : 'border-border bg-surface text-primary hover:border-border-strong',
                      ].join(' ')}
                    >
                      <span className="font-mono text-caption">{o.label}</span>
                      {isCorrectPick && <Check size={14} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
              {wrong[activeDefect.key] && (
                <p className="mt-2 text-caption text-danger">{wrong[activeDefect.key]}</p>
              )}
            </div>
          )}

          {/* Solved state */}
          {allFixed && (
            <div className="rounded-lg border border-success/40 bg-success/10 p-4">
              <p className="text-footnote font-semibold text-success">Все {DEFECTS.length} нарушений исправлены ✓</p>
              <p className="mt-1 text-caption text-secondary">
                Сравни «было» слева и «твой экран» — увидишь, как мелочи складываются в аккуратный
                экран.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-md border border-border px-3 py-1.5 text-caption font-medium text-secondary hover:bg-hover"
                >
                  Заново
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
