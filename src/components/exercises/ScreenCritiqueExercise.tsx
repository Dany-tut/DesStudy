'use client';

import { useMemo, useState } from 'react';
import { Check, CircleHelp, Lightbulb, RotateCcw, Tag, Sparkles, Loader2, Wrench } from 'lucide-react';
import type { ScreenCritiqueExercise as ScreenCritiqueExerciseType } from '@/lib/curriculum/types';
import type { CritiqueRoleId, CritiqueDefectId } from '@/lib/curriculum/types';
import {
  CRITIQUE_ROLES,
  CRITIQUE_DEFECTS,
  roleById,
  defectById,
  gradeRole,
  gradeDefects,
  worseVerdict,
  correctFixId,
  defectiveZones,
  rebuiltCount,
  critiqueSolved,
  emptyCritiqueAnswer,
  type Verdict,
  type CritiqueAnswer,
} from '@/lib/curriculum/screenCritique';
import type { FixReply } from '@/lib/ai/mentor';
import { PremiumCardScene } from './scenes/PremiumCardScene';
import { ImageScene } from './scenes/ImageScene';

const VERDICT_UI: Record<Verdict, { ring: string; label: string; icon: typeof Check; text: string; bg: string }> = {
  right: { ring: '#3FB950', label: 'Верно', icon: Check, text: 'text-[#3FB950]', bg: 'bg-[#3FB950]/10' },
  debatable: { ring: '#E3B341', label: 'Спорно', icon: CircleHelp, text: 'text-[#E3B341]', bg: 'bg-[#E3B341]/10' },
  wrong: { ring: '#E0785F', label: 'Иначе', icon: Lightbulb, text: 'text-[#E0785F]', bg: 'bg-[#E0785F]/10' },
};

const FIX_UI: Record<FixReply['verdict'], { label: string; text: string }> = {
  improves: { label: 'Улучшает', text: 'text-[#3FB950]' },
  subjective: { label: 'Дело вкуса', text: 'text-[#E3B341]' },
  breaks: { label: 'Сломала бы', text: 'text-[#F85149]' },
};

/**
 * Self-contained player for a `screen-critique` exercise. Owns the full hybrid
 * flow (diagnose role + defect → reconstruct via fix pick → check → 3-colour
 * results + AI fix coaching) and reports up via `onSolved` + a best-effort
 * /api/attempt when the learner has both diagnosed every zone and rebuilt every
 * defect correctly. Rendered directly by ExercisePlayer (bypasses the generic
 * submit/feedback shell, like a rich widget).
 */
export function ScreenCritiqueExercise({
  exercise,
  lessonSlug = '',
  skill = '',
  lessonTotal = 1,
  onSolved,
}: {
  exercise: ScreenCritiqueExerciseType;
  lessonSlug?: string;
  skill?: string;
  lessonTotal?: number;
  onSolved?: (attempts: number) => void;
}) {
  const [answer, setAnswer] = useState<CritiqueAnswer>(emptyCritiqueAnswer());
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [fixReplies, setFixReplies] = useState<Record<string, FixReply>>({});
  const [fixLoading, setFixLoading] = useState(false);

  const zones = exercise.zones;
  const zoneById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const rebuildTotal = defectiveZones(exercise).length;

  // Which zones are correctly reconstructed → drives the scene morph.
  const fixedSet = useMemo(() => {
    const s = new Set<string>();
    zones.forEach((z) => {
      if (z.fixes && answer.fixes[z.id] === correctFixId(z)) s.add(z.id);
    });
    return s;
  }, [zones, answer.fixes]);

  const solved = critiqueSolved(exercise, answer);
  const rebuilt = rebuiltCount(exercise, answer);
  const defectedIds = Object.keys(answer.defects).filter((id) => (answer.defects[id]?.length ?? 0) > 0);
  const diagnosedCount = new Set([...Object.keys(answer.roles), ...defectedIds]).size;

  // Per-zone verdicts, computed only after "Проверить".
  const verdicts = useMemo(() => {
    if (!checked) return {} as Record<string, { role?: Verdict; defect?: Verdict; worst?: Verdict }>;
    const out: Record<string, { role?: Verdict; defect?: Verdict; worst?: Verdict }> = {};
    zones.forEach((z) => {
      const role = answer.roles[z.id] ? gradeRole(z, answer.roles[z.id]) : undefined;
      const defect = gradeDefects(z, answer.defects[z.id] ?? []);
      if (role || defect) out[z.id] = { role, defect, worst: worseVerdict(role, defect) };
    });
    return out;
  }, [checked, zones, answer.roles, answer.defects]);

  const worstByZone = useMemo(() => {
    const m: Record<string, Verdict | undefined> = {};
    Object.entries(verdicts).forEach(([id, v]) => (m[id] = v.worst));
    return m;
  }, [verdicts]);

  const setRole = (role: CritiqueRoleId) =>
    selected && setAnswer((a) => ({ ...a, roles: { ...a.roles, [selected]: role } }));
  // Toggle a defect in/out of the zone's multi-select. "Здесь всё чисто" (none)
  // is exclusive — picking it clears the rest, and picking any real defect clears it.
  const toggleDefect = (defect: CritiqueDefectId) =>
    selected &&
    setAnswer((a) => {
      const cur = a.defects[selected] ?? [];
      let next: CritiqueDefectId[];
      if (defect === 'none') {
        next = cur.includes('none') ? [] : ['none'];
      } else if (cur.includes(defect)) {
        next = cur.filter((d) => d !== defect);
      } else {
        next = [...cur.filter((d) => d !== 'none'), defect];
      }
      return { ...a, defects: { ...a.defects, [selected]: next } };
    });
  const setFix = (fixId: string) =>
    selected && setAnswer((a) => ({ ...a, fixes: { ...a.fixes, [selected]: fixId } }));
  const setNote = (note: string) =>
    selected && setAnswer((a) => ({ ...a, notes: { ...a.notes, [selected]: note } }));

  async function check() {
    setChecked(true);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (critiqueSolved(exercise, answer)) {
      onSolved?.(nextAttempts);
      void recordAttempt(nextAttempts);
    }
    // Coach every non-empty free-text fix note.
    const pending = zones.filter((z) => answer.notes[z.id]?.trim());
    if (pending.length === 0) return;
    setFixLoading(true);
    try {
      const results = await Promise.all(
        pending.map(async (z) => {
          try {
            const res = await fetch('/api/critique-fix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                screenTitle: exercise.screenTitle,
                region: z.label,
                intent: z.intent,
                fix: answer.notes[z.id],
              }),
            });
            return [z.id, (await res.json()) as FixReply] as const;
          } catch {
            return [
              z.id,
              { verdict: 'subjective', comment: 'Не удалось связаться с ментором — оцени правку по разбору.', offline: true } as FixReply,
            ] as const;
          }
        }),
      );
      setFixReplies(Object.fromEntries(results));
    } finally {
      setFixLoading(false);
    }
  }

  async function recordAttempt(tries: number) {
    try {
      await fetch('/api/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonSlug, exerciseId: exercise.id, skill, correct: true, tries, lessonTotal }),
      });
    } catch {
      /* progress is best-effort */
    }
  }

  function refine() {
    setChecked(false);
    setFixReplies({});
  }
  function reset() {
    setAnswer(emptyCritiqueAnswer());
    setSelected(null);
    setChecked(false);
    setAttempts(0);
    setFixReplies({});
  }

  const summary = useMemo(() => {
    const vals = Object.values(verdicts).flatMap((v) => [v.role, v.defect].filter(Boolean) as Verdict[]);
    return {
      right: vals.filter((v) => v === 'right').length,
      debatable: vals.filter((v) => v === 'debatable').length,
      wrong: vals.filter((v) => v === 'wrong').length,
    };
  }, [verdicts]);

  const sel = selected ? zoneById.get(selected) : undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* LEFT — the (morphing) screen: uploaded image or built-in DOM scene */}
      <div className="flex justify-center lg:justify-start">
        {exercise.scene === 'image' && exercise.image ? (
          <ImageScene
            image={exercise.image}
            zones={zones}
            fixed={fixedSet}
            selected={selected}
            onSelect={setSelected}
            verdicts={checked ? worstByZone : undefined}
            checked={checked}
            interactive={!checked}
          />
        ) : (
          <PremiumCardScene
            fixed={fixedSet}
            selected={selected}
            onSelect={setSelected}
            verdicts={checked ? worstByZone : undefined}
            checked={checked}
            interactive={!checked}
          />
        )}
      </div>

      {/* RIGHT — diagnose/reconstruct panel, then results */}
      <div className="flex flex-col gap-5">
        {!checked ? (
          <>
            <div className="rounded-xl border border-border bg-elevated p-5">
              {sel ? (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Tag size={16} />
                    </span>
                    <div>
                      <span className="block text-caption text-tertiary">Выбрана зона</span>
                      <span className="block text-callout font-semibold text-primary">{sel.label}</span>
                    </div>
                  </div>

                  {/* Role */}
                  <p className="mb-2 text-caption text-tertiary">Какая это роль на экране?</p>
                  <div className="flex flex-col gap-2">
                    {CRITIQUE_ROLES.map((role) => {
                      const active = answer.roles[sel.id] === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setRole(role.id)}
                          className={[
                            'flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-fast',
                            active ? 'border-brand bg-brand/10' : 'border-border bg-surface hover:border-brand/40',
                          ].join(' ')}
                        >
                          <span className={['text-footnote font-medium', active ? 'text-brand' : 'text-primary'].join(' ')}>
                            {role.label}
                          </span>
                          <span className="text-caption text-tertiary">{role.hint}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Defect */}
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-3 text-caption text-tertiary">
                      Что здесь не так? <span className="text-tertiary/70">— можно выбрать несколько</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {CRITIQUE_DEFECTS.map((d) => {
                        const active = (answer.defects[sel.id] ?? []).includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => toggleDefect(d.id)}
                            title={d.hint}
                            aria-pressed={active}
                            className={[
                              'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-footnote font-medium transition-fast',
                              active ? 'border-brand bg-brand/10 text-brand' : 'border-border bg-surface text-primary hover:border-brand/40',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-fast',
                                active ? 'border-brand bg-brand text-on-brand' : 'border-border',
                              ].join(' ')}
                              aria-hidden
                            >
                              {active && <Check size={11} strokeWidth={3} />}
                            </span>
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reconstruct */}
                  {sel.fixes && sel.fixes.length > 0 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="mb-3 flex items-center gap-1.5 text-caption text-tertiary">
                        <Wrench size={13} /> Как это починить?
                      </p>
                      <div className="flex flex-col gap-2">
                        {sel.fixes.map((f) => {
                          const active = answer.fixes[sel.id] === f.id;
                          const isRight = active && f.id === correctFixId(sel);
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setFix(f.id)}
                              className={[
                                'flex items-center justify-between rounded-lg border px-3 py-2 text-left text-footnote font-medium transition-fast',
                                isRight
                                  ? 'border-[#3FB950] bg-[#3FB950]/10 text-[#3FB950]'
                                  : active
                                    ? 'border-brand bg-brand/10 text-brand'
                                    : 'border-border bg-surface text-primary hover:border-brand/40',
                              ].join(' ')}
                            >
                              {f.label}
                              {isRight && <Check size={15} />}
                            </button>
                          );
                        })}
                      </div>
                      {answer.fixes[sel.id] && answer.fixes[sel.id] !== correctFixId(sel) && (
                        <p className="mt-2 text-caption text-tertiary">
                          Экран пока не починился — попробуй другой вариант.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Optional note */}
                  <div className="mt-4 border-t border-border pt-4">
                    <label className="mb-2 block text-caption text-tertiary">
                      Что бы ты здесь поправил словами? (необязательно)
                    </label>
                    <textarea
                      value={answer.notes[sel.id] ?? ''}
                      onChange={(e) => setNote(e.target.value)}
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
                    Кликни любую зону на экране слева: назови роль, дефект и выбери исправление.
                  </p>
                </div>
              )}
            </div>

            {/* Touched zones */}
            {diagnosedCount > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {zones
                  .filter((z) => answer.roles[z.id] || (answer.defects[z.id]?.length ?? 0) > 0)
                  .map((z) => {
                    const role = roleById(answer.roles[z.id]);
                    const defects = (answer.defects[z.id] ?? [])
                      .map((id) => defectById(id)?.label)
                      .filter(Boolean)
                      .join(', ');
                    const done = fixedSet.has(z.id);
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setSelected(z.id)}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-caption text-secondary transition-fast hover:border-brand/40"
                      >
                        {done && <Check size={12} className="text-[#3FB950]" />}
                        <span className="font-medium text-primary">{z.label}</span>
                        <span className="text-tertiary">
                          {role ? role.label : '—'}
                          {defects ? ` · ${defects}` : ''}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-caption text-tertiary">
                Размечено: {diagnosedCount} из {zones.length} · Пересобрано: {rebuilt} из {rebuildTotal}
              </span>
              <button
                type="button"
                onClick={check}
                disabled={diagnosedCount === 0}
                className="rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Проверить
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Solved banner */}
            {solved && (
              <div className="flex items-center gap-2 rounded-lg bg-[#3FB950]/10 px-4 py-3">
                <Check size={16} className="text-[#3FB950]" />
                <span className="text-footnote font-semibold text-[#3FB950]">
                  Экран пересобран и разобран — задание пройдено
                </span>
              </div>
            )}

            {/* Summary */}
            <div className="flex flex-wrap gap-2">
              {(['right', 'debatable', 'wrong'] as Verdict[]).map((v) => {
                const ui = VERDICT_UI[v];
                const Icon = ui.icon;
                return (
                  <div key={v} className={['flex items-center gap-2 rounded-lg px-3 py-2', ui.bg].join(' ')}>
                    <Icon size={15} className={ui.text} />
                    <span className={['text-footnote font-semibold', ui.text].join(' ')}>
                      {summary[v]} · {ui.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Per-zone verdicts */}
            <div className="flex flex-col gap-2">
              {zones
                .filter((z) => verdicts[z.id])
                .map((z) => {
                  const vd = verdicts[z.id];
                  const worst = vd.worst ?? 'right';
                  const ui = VERDICT_UI[worst];
                  const Icon = ui.icon;
                  const role = roleById(answer.roles[z.id]);
                  const pickedDefects = answer.defects[z.id] ?? [];
                  const defectLabels = pickedDefects
                    .map((id) => defectById(id)?.label)
                    .filter(Boolean)
                    .join(', ');
                  const correctRole = roleById(z.role)!;
                  const correctDefect = defectById(z.defect)!;
                  const fixDone = fixedSet.has(z.id);
                  const hasFix = z.fixes && z.fixes.length > 0;
                  return (
                    <div
                      key={z.id}
                      className="rounded-xl border border-border bg-elevated p-4"
                      style={{ borderLeft: `3px solid ${ui.ring}` }}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Icon size={15} className={ui.text} />
                        <span className="text-footnote font-semibold text-primary">{z.label}</span>
                      </div>

                      {role && vd.role && (
                        <div className="mb-1.5">
                          <p className="text-caption text-tertiary">
                            <span className={['font-medium', VERDICT_UI[vd.role].text].join(' ')}>{VERDICT_UI[vd.role].label}</span>{' '}
                            · роль: <span className="text-secondary">{role.label}</span>
                            {vd.role !== 'right' && (
                              <>
                                {' '}· сильное прочтение: <span className="text-secondary">{correctRole.label}</span>
                              </>
                            )}
                          </p>
                          {vd.role !== 'right' && <p className="mt-0.5 text-footnote text-secondary">{z.roleNote}</p>}
                        </div>
                      )}

                      {defectLabels && vd.defect && (
                        <div className="mb-1">
                          <p className="text-caption text-tertiary">
                            <span className={['font-medium', VERDICT_UI[vd.defect].text].join(' ')}>{VERDICT_UI[vd.defect].label}</span>{' '}
                            · {pickedDefects.length > 1 ? 'дефекты' : 'дефект'}: <span className="text-secondary">{defectLabels}</span>
                            {vd.defect !== 'right' && (
                              <>
                                {' '}· на деле: <span className="text-secondary">{correctDefect.label}</span>
                              </>
                            )}
                          </p>
                          {vd.defect !== 'right' && <p className="mt-0.5 text-footnote text-secondary">{z.defectNote}</p>}
                        </div>
                      )}

                      {hasFix && (
                        <p className="mt-1 flex items-center gap-1.5 text-caption">
                          <Wrench size={12} className={fixDone ? 'text-[#3FB950]' : 'text-[#E0785F]'} />
                          <span className={fixDone ? 'text-[#3FB950]' : 'text-[#E0785F]'}>
                            {fixDone ? 'Пересобрано верно' : 'Ещё не пересобрано — вернись и выбери верное исправление'}
                          </span>
                        </p>
                      )}

                      {answer.notes[z.id]?.trim() && (
                        <div className="mt-2 rounded-lg border border-border bg-surface p-2.5">
                          <p className="text-caption text-tertiary">Твоя правка: «{answer.notes[z.id]}»</p>
                          {fixLoading && !fixReplies[z.id] ? (
                            <p className="mt-1.5 flex items-center gap-1.5 text-caption text-tertiary">
                              <Loader2 size={12} className="animate-spin" /> Ментор оценивает правку…
                            </p>
                          ) : (
                            fixReplies[z.id] && (
                              <div className="mt-1.5">
                                <span className={['inline-flex items-center gap-1 text-caption font-medium', FIX_UI[fixReplies[z.id].verdict].text].join(' ')}>
                                  <Sparkles size={12} />
                                  {FIX_UI[fixReplies[z.id].verdict].label}
                                  {fixReplies[z.id].offline && <span className="text-tertiary">· офлайн</span>}
                                </span>
                                <p className="mt-0.5 text-footnote text-secondary">{fixReplies[z.id].comment}</p>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex flex-wrap gap-3">
              {!solved && (
                <button
                  type="button"
                  onClick={refine}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90"
                >
                  <Wrench size={15} /> Доработать
                </button>
              )}
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-footnote font-medium text-secondary transition-fast hover:bg-hover"
              >
                <RotateCcw size={15} /> Пройти заново
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
