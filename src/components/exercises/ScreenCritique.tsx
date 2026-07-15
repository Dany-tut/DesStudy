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
  Lightbulb,
  RotateCcw,
  Tag,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { FixReply } from '@/lib/ai/mentor';
import { useT } from '@/lib/i18n/client';

/**
 * Screen-critique — the INVERSE of screen-walkthrough. Instead of the mentor
 * narrating each layer, the learner does the diagnosis: they click a region of
 * a real reference screen and assign it a ROLE from the palette on the right
 * ("главный акцент", "реклама — не часть карты", "второстепенное", …), and can
 * optionally write what they'd change. "Проверить" then grades every assignment
 * against ground truth in THREE states — because design is subjective:
 *   • верно  (green)  — matches the strongest reading
 *   • спорно (yellow) — a defensible-but-not-only-right reading; mentor explains
 *   • иначе  (coral)  — reads against the hierarchy; softened, not a "wrong" buzzer
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

const ROLES: { id: RoleId }[] = [
  { id: 'accent' },
  { id: 'secondary' },
  { id: 'promo' },
  { id: 'neutral' },
  { id: 'nav' },
];

interface Truth {
  correct: RoleId;
  /** defensible-but-not-only-right readings → yellow "спорно". */
  debatable: RoleId[];
  /** what a mentor says for a debatable pick, and why the correct one is stronger. */
  note: string;
  /** design intent of the region — ground truth the mentor judges a fix against. */
  intent: string;
}

const TRUTH: Record<Region, Truth> = {
  topbar: {
    correct: 'nav',
    debatable: ['neutral'],
    note: 'Топ-бар и правда почти нейтрален — но у него есть работа: вход назад и настройки. Это навигация, а не просто фон.',
    intent:
      'Минимальный топ-бар: назад слева, настройки справа, между ними воздух. Намеренно тихий, чтобы не конкурировать с балансом за внимание — только обрамляет экран и даёт выход.',
  },
  header: {
    correct: 'accent',
    debatable: [],
    note: 'Баланс 980 000 ₽ — то, ради чего открывают экран. Это главный акцент, спорить тут почти не с чем.',
    intent:
      'Шапка карты с балансом — смысловой центр экрана. Заголовок слева, баланс прижат вправо по одной линии. Баланс намеренно крупный и контрастный — это первое, что должен увидеть глаз.',
  },
  chips: {
    correct: 'secondary',
    debatable: ['neutral'],
    note: 'Чипы карты — второстепенное: они нужны, но не тянут взгляд. Назвать их «нейтральным фоном» можно, но у них есть смысл (номер, добавить).',
    intent:
      'Чипы карты: последние цифры и кнопка добавить. Второстепенный, но осмысленный ряд — меньший радиус и размер, чем у плиток действий, чтобы не спорить с ними за вес.',
  },
  actions: {
    correct: 'secondary',
    debatable: ['neutral'],
    note: 'Быстрые действия — важное второстепенное. Как «нейтральный фон» их видеть можно (серые плитки), но по функции это ядро сценария.',
    intent:
      'Три плитки быстрых действий делят ширину на равные колонки (space-between), иконки и подписи центрированы. Нейтральные поверхности — важные по функции, но визуально спокойные, чтобы не перебивать баланс.',
  },
  promo: {
    correct: 'promo',
    debatable: ['accent'],
    note: 'Промо-вклад — реклама, живёт отдельно от карты. Назвать его «главным акцентом» защитимо — он яркий и продаёт — но это НЕ то, ради чего пришёл пользователь.',
    intent:
      'Промо-вклад — рекламный блок в фирменном фиолетовом. Живёт отдельно от карты. Яркий намеренно (продаёт), но по иерархии ниже баланса — пользователь пришёл не за ним.',
  },
  bonuses: {
    correct: 'secondary',
    debatable: ['promo'],
    note: 'Бонусы — второстепенная выгода по карте. Близко к «рекламе», но это свойство продукта, а не отдельный баннер.',
    intent:
      'Бонусы по карте — две плитки кэшбэка с оранжевым акцентом-иконкой. Второстепенная выгода продукта: единственный тёплый цвет на экране цепляет глаз, но блок стоит внизу, после главного.',
  },
};

const SCREEN_TITLE =
  'Экран банковской «Премиум карты» — баланс, действия, промо и бонусы';

type Assignments = Partial<Record<Region, RoleId>>;
type Fixes = Partial<Record<Region, string>>;

function grade(region: Region, role: RoleId): Verdict {
  const t = TRUTH[region];
  if (role === t.correct) return 'right';
  if (t.debatable.includes(role)) return 'debatable';
  return 'wrong';
}

// ── Defect layer: on the intentionally-broken screen the learner also names
// WHAT is wrong in each region, not just its role. ────────────────────────
type DefectId = 'hierarchy' | 'radius' | 'contrast' | 'alignment' | 'consistency' | 'none';

const DEFECTS: { id: DefectId }[] = [
  { id: 'hierarchy' },
  { id: 'radius' },
  { id: 'contrast' },
  { id: 'alignment' },
  { id: 'consistency' },
  { id: 'none' },
];

interface DefectTruth {
  correct: DefectId;
  debatable: DefectId[];
  note: string;
}

/** Which defect was deliberately injected into each region (see CritiqueScreen). */
const DEFECT_TRUTH: Record<Region, DefectTruth> = {
  topbar: {
    correct: 'alignment',
    debatable: [],
    note: 'Иконка настроек съехала вниз — сбита оптическая линия с «назад».',
  },
  header: {
    correct: 'hierarchy',
    debatable: ['alignment'],
    note: 'Баланс — смысл экрана — сделан мелким и тусклым: акцент не читается. Он ещё и ушёл от правого поля, но первично сломана иерархия.',
  },
  chips: {
    correct: 'radius',
    debatable: [],
    note: 'Карта почти прямоугольная рядом с «плюсом»-пилюлей — скругления вразнобой.',
  },
  actions: {
    correct: 'radius',
    debatable: ['alignment'],
    note: 'Три плитки с разными скруглениями и неровным шагом — ряд не читается как система.',
  },
  promo: {
    correct: 'contrast',
    debatable: [],
    note: 'Заголовок оффера почти сливается с фиолетовым фоном — контраст завален.',
  },
  bonuses: {
    correct: 'consistency',
    debatable: ['hierarchy'],
    note: 'Две карточки оформлены по-разному (поля, радиусы, «5%» только на одной). Заголовок секции тоже слаб, но первично — рассогласованность плиток.',
  },
};

function gradeDefect(region: Region, defect: DefectId): Verdict {
  const t = DEFECT_TRUTH[region];
  if (defect === t.correct) return 'right';
  if (t.debatable.includes(defect)) return 'debatable';
  return 'wrong';
}

const VERDICT_RANK: Record<Verdict, number> = { right: 0, debatable: 1, wrong: 2 };
/** The stronger warning of two verdicts (used for the screen outline colour). */
function worseVerdict(a?: Verdict, b?: Verdict): Verdict | undefined {
  if (!a) return b;
  if (!b) return a;
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

const VERDICT_UI: Record<
  Verdict,
  { ring: string; icon: typeof Check; text: string; bg: string }
> = {
  right: { ring: '#3FB950', icon: Check, text: 'text-[#3FB950]', bg: 'bg-[#3FB950]/10' },
  debatable: { ring: '#E3B341', icon: CircleHelp, text: 'text-[#E3B341]', bg: 'bg-[#E3B341]/10' },
  wrong: { ring: '#E0785F', icon: Lightbulb, text: 'text-[#E0785F]', bg: 'bg-[#E0785F]/10' },
};

/** Mentor verdict on a free-text fix → same green/yellow/red language. */
const FIX_UI: Record<FixReply['verdict'], { text: string }> = {
  improves: { text: 'text-[#3FB950]' },
  subjective: { text: 'text-[#E3B341]' },
  breaks: { text: 'text-[#F85149]' },
};

/** The three compact steps inside a selected-region panel (labels/titles via i18n). */
const CRITIQUE_STEPS = [{ id: 'role' }, { id: 'defect' }, { id: 'fix' }] as const;

export function ScreenCritique() {
  const { t } = useT();
  const NS = 'exercises.screenCritique';
  const roleLabel = (id: RoleId) => t(`${NS}.roles.${id}.label`);
  const roleHint = (id: RoleId) => t(`${NS}.roles.${id}.hint`);
  const defectLabel = (id: DefectId) => t(`${NS}.defects.${id}.label`);
  const defectHint = (id: DefectId) => t(`${NS}.defects.${id}.hint`);
  const regionTitle = (r: Region) => t(`${NS}.regionTitles.${r}`);
  const roleNote = (r: Region) => t(`${NS}.roleNotes.${r}`);
  const defectNote = (r: Region) => t(`${NS}.defectNotes.${r}`);
  const verdictLabel = (v: Verdict) => t(`${NS}.verdict.${v}`);
  const fixLabel = (v: FixReply['verdict']) => t(`${NS}.fix.${v}`);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [defectPicks, setDefectPicks] = useState<Partial<Record<Region, DefectId>>>({});
  const [fixes, setFixes] = useState<Fixes>({});
  const [selected, setSelected] = useState<Region | null>(null);
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);
  const [fixReplies, setFixReplies] = useState<Partial<Record<Region, FixReply>>>({});
  const [fixLoading, setFixLoading] = useState(false);

  /** Per-region verdicts on both dimensions + the stronger of the two. */
  const verdicts = useMemo(() => {
    if (!checked) return {} as Record<Region, { role?: Verdict; defect?: Verdict; worst?: Verdict }>;
    const out = {} as Record<Region, { role?: Verdict; defect?: Verdict; worst?: Verdict }>;
    const regions = new Set<Region>([
      ...(Object.keys(assignments) as Region[]),
      ...(Object.keys(defectPicks) as Region[]),
    ]);
    regions.forEach((r) => {
      const role = assignments[r] ? grade(r, assignments[r]!) : undefined;
      const defect = defectPicks[r] ? gradeDefect(r, defectPicks[r]!) : undefined;
      out[r] = { role, defect, worst: worseVerdict(role, defect) };
    });
    return out;
  }, [checked, assignments, defectPicks]);

  const assignedCount = new Set<Region>([
    ...(Object.keys(assignments) as Region[]),
    ...(Object.keys(defectPicks) as Region[]),
  ]).size;

  function selectRegion(r: Region) {
    setSelected(r);
    setStep(0);
  }

  function assignRole(role: RoleId) {
    if (!selected) return;
    setAssignments((a) => ({ ...a, [selected]: role }));
  }

  function assignDefect(defect: DefectId) {
    if (!selected) return;
    setDefectPicks((d) => ({ ...d, [selected]: defect }));
  }

  async function check() {
    setChecked(true);
    // Send every non-empty fix note to the mentor for a 3-state verdict.
    const pending = (Object.keys(fixes) as Region[]).filter((r) => fixes[r]?.trim());
    if (pending.length === 0) return;
    setFixLoading(true);
    try {
      const results = await Promise.all(
        pending.map(async (r) => {
          try {
            const res = await fetch('/api/critique-fix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                screenTitle: SCREEN_TITLE,
                region: regionTitle(r),
                intent: TRUTH[r].intent,
                fix: fixes[r],
              }),
            });
            return [r, (await res.json()) as FixReply] as const;
          } catch {
            return [
              r,
              {
                verdict: 'subjective',
                comment: t(`${NS}.offlineComment`),
                offline: true,
              } as FixReply,
            ] as const;
          }
        }),
      );
      setFixReplies(Object.fromEntries(results));
    } finally {
      setFixLoading(false);
    }
  }

  function reset() {
    setAssignments({});
    setDefectPicks({});
    setFixes({});
    setSelected(null);
    setStep(0);
    setChecked(false);
    setFixReplies({});
    setFixLoading(false);
  }

  const summary = useMemo(() => {
    // Count both dimensions (role + defect) so the tally reflects all judgements.
    const vals = Object.values(verdicts).flatMap((v) => [v.role, v.defect].filter(Boolean) as Verdict[]);
    return {
      right: vals.filter((v) => v === 'right').length,
      debatable: vals.filter((v) => v === 'debatable').length,
      wrong: vals.filter((v) => v === 'wrong').length,
    };
  }, [verdicts]);

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[640px] text-footnote text-secondary">
        {t(`${NS}.intro`)}
      </p>

      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* LEFT — interactive screen */}
        <div className="flex justify-center lg:justify-start">
          <CritiqueScreen
            selected={selected}
            onSelect={selectRegion}
            assignments={assignments}
            defectPicks={defectPicks}
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
                        <span className="block text-caption text-tertiary">{t(`${NS}.selectedZone`)}</span>
                        <span className="block text-callout font-semibold text-primary">
                          {regionTitle(selected)}
                        </span>
                      </div>
                    </div>
                    {/* Step header — dots + "Шаг N из 3 · <label>" */}
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-caption text-tertiary">
                        {t(`${NS}.stepCounter`, { current: step + 1, total: CRITIQUE_STEPS.length })} ·{' '}
                        <span className="text-secondary">{t(`${NS}.steps.${CRITIQUE_STEPS[step].id}.title`)}</span>
                        {step === 2 && <span className="text-tertiary/70"> {t(`${NS}.optional`)}</span>}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {CRITIQUE_STEPS.map((s, i) => (
                          <button
                            key={s.id}
                            type="button"
                            aria-label={t(`${NS}.steps.${s.id}.label`)}
                            onClick={() => setStep(i)}
                            className={[
                              'h-1.5 rounded-full transition-fast',
                              i === step ? 'w-5 bg-brand' : 'w-1.5 bg-border hover:bg-brand/40',
                            ].join(' ')}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Step 0 — role */}
                    {step === 0 && (
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
                                {roleLabel(role.id)}
                              </span>
                              <span className="text-caption text-tertiary">{roleHint(role.id)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Step 1 — defect */}
                    {step === 1 && (
                      <div className="grid grid-cols-2 gap-2">
                        {DEFECTS.map((d) => {
                          const active = defectPicks[selected] === d.id;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => assignDefect(d.id)}
                              title={defectHint(d.id)}
                              className={[
                                'rounded-lg border px-3 py-2 text-left text-footnote font-medium transition-fast',
                                active
                                  ? 'border-brand bg-brand/10 text-brand'
                                  : 'border-border bg-surface text-primary hover:border-brand/40',
                              ].join(' ')}
                            >
                              {defectLabel(d.id)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Step 2 — free-text fix */}
                    {step === 2 && (
                      <textarea
                        value={fixes[selected] ?? ''}
                        onChange={(e) =>
                          setFixes((f) => ({ ...f, [selected]: e.target.value }))
                        }
                        rows={3}
                        placeholder={t(`${NS}.fixPlaceholder`)}
                        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
                      />
                    )}

                    {/* Step nav */}
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
                      <button
                        type="button"
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step === 0}
                        className="rounded-lg border border-border px-3 py-2 text-footnote font-medium text-secondary transition-fast hover:bg-hover disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        {t(`${NS}.back`)}
                      </button>
                      {step < CRITIQUE_STEPS.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setStep((s) => Math.min(CRITIQUE_STEPS.length - 1, s + 1))}
                          className="rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90"
                        >
                          {t(`${NS}.next`)}
                        </button>
                      ) : (
                        <span className="text-caption text-tertiary">{t(`${NS}.zoneMarked`)}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Tag size={18} />
                    </span>
                    <p className="text-footnote text-secondary">
                      {t(`${NS}.emptyHint`)}
                    </p>
                  </div>
                )}
              </div>

              {/* Assigned chips — role + defect per touched region */}
              {assignedCount > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {([...new Set<Region>([
                    ...(Object.keys(assignments) as Region[]),
                    ...(Object.keys(defectPicks) as Region[]),
                  ])] as Region[]).map((r) => {
                    const roleId = assignments[r];
                    const defectId = defectPicks[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => selectRegion(r)}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-caption text-secondary transition-fast hover:border-brand/40"
                      >
                        <span className="font-medium text-primary">{regionTitle(r)}</span>
                        <span className="text-tertiary">
                          {roleId ? roleLabel(roleId) : '—'}
                          {defectId ? ` · ${defectLabel(defectId)}` : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-caption text-tertiary">
                  {t(`${NS}.markedCount`, { count: assignedCount })}
                </span>
                <button
                  type="button"
                  onClick={check}
                  disabled={assignedCount === 0}
                  className="rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t(`${NS}.check`)}
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
                        {summary[v]} · {verdictLabel(v)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Per-region verdicts */}
              <div className="flex flex-col gap-2">
                {(Object.keys(verdicts) as Region[]).map((r) => {
                  const vd = verdicts[r];
                  const worst = vd.worst ?? 'right';
                  const ui = VERDICT_UI[worst];
                  const Icon = ui.icon;
                  const roleId = assignments[r];
                  const defectId = defectPicks[r];
                  const truth = TRUTH[r];
                  const dt = DEFECT_TRUTH[r];
                  return (
                    <div
                      key={r}
                      className="rounded-xl border border-border bg-elevated p-4"
                      style={{ borderLeft: `3px solid ${ui.ring}` }}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Icon size={15} className={ui.text} />
                        <span className="text-footnote font-semibold text-primary">
                          {regionTitle(r)}
                        </span>
                      </div>

                      {/* Role dimension */}
                      {roleId && vd.role && (
                        <div className="mb-1.5">
                          <p className="text-caption text-tertiary">
                            <span className={['font-medium', VERDICT_UI[vd.role].text].join(' ')}>
                              {verdictLabel(vd.role)}
                            </span>{' '}
                            · {t(`${NS}.roleColon`)} <span className="text-secondary">{roleLabel(roleId)}</span>
                            {vd.role !== 'right' && (
                              <>
                                {' '}
                                · {t(`${NS}.strongReading`)}{' '}
                                <span className="text-secondary">{roleLabel(truth.correct)}</span>
                              </>
                            )}
                          </p>
                          {vd.role !== 'right' && (
                            <p className="mt-0.5 text-footnote text-secondary">{roleNote(r)}</p>
                          )}
                        </div>
                      )}

                      {/* Defect dimension */}
                      {defectId && vd.defect && (
                        <div className="mb-1">
                          <p className="text-caption text-tertiary">
                            <span className={['font-medium', VERDICT_UI[vd.defect].text].join(' ')}>
                              {verdictLabel(vd.defect)}
                            </span>{' '}
                            · {t(`${NS}.defectColon`)} <span className="text-secondary">{defectLabel(defectId)}</span>
                            {vd.defect !== 'right' && (
                              <>
                                {' '}
                                · {t(`${NS}.actually`)}{' '}
                                <span className="text-secondary">{defectLabel(dt.correct)}</span>
                              </>
                            )}
                          </p>
                          {vd.defect !== 'right' && (
                            <p className="mt-0.5 text-footnote text-secondary">{defectNote(r)}</p>
                          )}
                        </div>
                      )}

                      {fixes[r]?.trim() && (
                        <div className="mt-2 rounded-lg border border-border bg-surface p-2.5">
                          <p className="text-caption text-tertiary">{t(`${NS}.yourFix`, { fix: fixes[r] ?? '' })}</p>
                          {fixLoading && !fixReplies[r] ? (
                            <p className="mt-1.5 flex items-center gap-1.5 text-caption text-tertiary">
                              <Loader2 size={12} className="animate-spin" />
                              {t(`${NS}.mentorEvaluating`)}
                            </p>
                          ) : (
                            fixReplies[r] && (
                              <div className="mt-1.5">
                                <span
                                  className={[
                                    'inline-flex items-center gap-1 text-caption font-medium',
                                    FIX_UI[fixReplies[r]!.verdict].text,
                                  ].join(' ')}
                                >
                                  <Sparkles size={12} />
                                  {fixLabel(fixReplies[r]!.verdict)}
                                  {fixReplies[r]!.offline && (
                                    <span className="text-tertiary">· {t(`${NS}.offline`)}</span>
                                  )}
                                </span>
                                <p className="mt-0.5 text-footnote text-secondary">
                                  {fixReplies[r]!.comment}
                                </p>
                              </div>
                            )
                          )}
                        </div>
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
                {t(`${NS}.retry`)}
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
  defectPicks,
  verdicts,
  checked,
}: {
  selected: Region | null;
  onSelect: (r: Region) => void;
  assignments: Assignments;
  defectPicks: Partial<Record<Region, DefectId>>;
  verdicts: Record<Region, { role?: Verdict; defect?: Verdict; worst?: Verdict }>;
  checked: boolean;
}) {
  // Ring colour for a region: worst verdict after check, brand while selecting.
  const regionStyle = (r: Region): React.CSSProperties => {
    const wv = verdicts[r]?.worst;
    if (checked && wv) {
      return { outline: `2px solid ${VERDICT_UI[wv].ring}`, outlineOffset: 3, borderRadius: 'inherit' };
    }
    if (!checked && selected === r) {
      return { outline: `2px solid ${APP.brand}`, outlineOffset: 3, borderRadius: 'inherit' };
    }
    if (!checked && (assignments[r] || defectPicks[r])) {
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

  // Small corner badge showing the region's worst verdict after check.
  const Badge = ({ r }: { r: Region }) => {
    const wv = verdicts[r]?.worst;
    if (!checked || !wv) return null;
    const ui = VERDICT_UI[wv];
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
      {/* Top bar — DEFECT: иконки не на одной оптической линии (настройки съехали вниз). */}
      <div className={cls('topbar')} style={regionStyle('topbar')} onClick={handle('topbar')}>
        <Badge r="topbar" />
        <div className="flex items-start justify-between">
          <ArrowLeft size={20} />
          <Settings2 size={18} style={{ color: APP.textDim, marginTop: 7 }} />
        </div>
      </div>

      {/* Card header — DEFECT: баланс (главный смысл экрана) мелкий, тусклый и съехал
          вниз — иерархия сломана, акцент не читается; вдобавок ушёл от правого поля. */}
      <div className={['mt-5', cls('header')].join(' ')} style={regionStyle('header')} onClick={handle('header')}>
        <Badge r="header" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px]" style={{ color: APP.textDim }}>
              Название карты
            </p>
            <p className="text-[15px] font-semibold">Премиум карта</p>
          </div>
          <p className="mr-3 mt-3 text-[13px] font-normal tabular-nums" style={{ color: APP.textDim }}>
            980 000 ₽
          </p>
        </div>
      </div>

      {/* Card chips */}
      <div
        className={['mt-3 flex items-center gap-2', cls('chips')].join(' ')}
        style={regionStyle('chips')}
        onClick={handle('chips')}
      >
        {/* DEFECT: скругления вразнобой — карта почти прямоугольная, «плюс» — пилюля. */}
        <Badge r="chips" />
        <span
          className="flex h-11 w-16 items-end rounded-sm p-2 text-[11px] font-medium"
          style={{ background: `linear-gradient(135deg, ${APP.brand}, ${APP.brandSoft})` }}
        >
          3567
        </span>
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: APP.surface, color: APP.textDim }}
        >
          <Plus size={18} />
        </span>
      </div>

      {/* Quick actions — DEFECT: у трёх плиток разные скругления (скруглённая /
          прямая / пилюля) и неравный шаг между ними — ряд не читается как система. */}
      <div
        className={['mt-4 flex justify-between', cls('actions')].join(' ')}
        style={regionStyle('actions')}
        onClick={handle('actions')}
      >
        <Badge r="actions" />
        {[
          { icon: CreditCard, label: 'Оплатить', radius: 'rounded-2xl', ml: 0 },
          { icon: Plus, label: 'Пополнить', radius: 'rounded-none', ml: 6 },
          { icon: ArrowLeftRight, label: 'Перевести', radius: 'rounded-full', ml: 14 },
        ].map(({ icon: Icon, label, radius, ml }) => (
          <div
            key={label}
            className={['flex flex-1 flex-col items-center gap-2 py-3', radius].join(' ')}
            style={{ background: APP.surface, marginLeft: ml }}
          >
            <Icon size={18} style={{ color: APP.textDim }} />
            <span className="text-[11px]" style={{ color: APP.textDim }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Promo — DEFECT: заголовок оффера почти нечитаем (слабый контраст текста
          на фиолетовом) и прижат тесными полями — реклама не работает. */}
      <div
        className={['mt-4 overflow-hidden rounded-2xl p-2', cls('promo')].join(' ')}
        style={{
          background: `linear-gradient(120deg, ${APP.brand}, ${APP.brandSoft})`,
          ...regionStyle('promo'),
        }}
        onClick={handle('promo')}
      >
        <Badge r="promo" />
        <p
          className="max-w-[70%] text-[15px] font-bold leading-tight"
          style={{ color: 'rgba(255,255,255,0.42)' }}
        >
          Откройте вклад с увеличенной ставкой до 18%
        </p>
      </div>

      {/* Bonuses — DEFECT: заголовок секции слишком мелкий и тусклый, не читается
          как заголовок (сломана иерархия). */}
      <p className="relative z-10 mt-3 text-[10px] font-normal" style={{ color: APP.textDim }}>
        Бонусы по карте
      </p>
      {/* DEFECT: две карточки рассогласованы — разные поля и скругления, «5%» только
          на одной; сетка не держит систему. */}
      <div
        className={['mt-3 grid grid-cols-2 gap-3 items-start', cls('bonuses')].join(' ')}
        style={regionStyle('bonuses')}
        onClick={handle('bonuses')}
      >
        <Badge r="bonuses" />
        {[
          { icon: Utensils, text: 'Кэшбэк за бронирование ресторанов', pct: '5%', pad: 'p-3', radius: 'rounded-2xl' },
          { icon: Hotel, text: 'Кэшбэк за бронирование туров и отелей', pct: '', pad: 'p-1.5', radius: 'rounded-md' },
        ].map(({ icon: Icon, text, pct, pad, radius }) => (
          <div
            key={text}
            className={['flex flex-col items-center gap-3 text-center', pad, radius].join(' ')}
            style={{ background: APP.surface }}
          >
            <span className="text-[11px] font-medium leading-tight">{text}</span>
            {pct && (
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
        ))}
      </div>
    </div>
  );
}
