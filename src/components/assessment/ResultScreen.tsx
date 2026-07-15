'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, Sparkles, Target } from 'lucide-react';
import { CrystalGem, type GemTone } from '@/components/achievements/CrystalGem';
import {
  CATEGORIES,
  GRADE_LABEL,
  skillsInCategory,
  type Grade,
  type SkillLevel,
} from '@/lib/assessment/taxonomy';
import { growthSkills, type GradeResult, type Scores } from '@/lib/assessment/grade';
import { SKILL_BY_ID } from '@/lib/assessment/taxonomy';
import { recommendationFor } from '@/lib/assessment/recommendations';
import { Confetti } from './Confetti';
import { RadarChart } from './RadarChart';

const GRADE_TONE: Record<Grade, GemTone> = {
  junior: 'sapphire',
  middle: 'amethyst',
  senior: 'gold',
};
const GRADE_TAGLINE: Record<Grade, string> = {
  junior: 'Крепкий фундамент — впереди самый быстрый рост',
  middle: 'Уверенный уровень. Точки роста приблизят к senior',
  senior: 'Сильный профиль. Осталось отшлифовать детали',
};

/** The celebratory result screen shown right after the learner finishes. */
export function ResultScreen({
  scores,
  result,
  name,
}: {
  scores: Scores;
  result: GradeResult;
  name: string;
}) {
  const growth = growthSkills(scores);

  return (
    <main className="relative mx-auto max-w-[860px] px-6 py-14">
      <Confetti />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center text-center"
      >
        <CrystalGem tone={GRADE_TONE[result.grade]} size={112} />
        <p className="mt-4 text-footnote uppercase tracking-widest text-tertiary">
          {name ? `${name}, ваш грейд` : 'Ваш грейд'}
        </p>
        <h1 className="mt-1 text-display font-bold capitalize text-primary">
          {GRADE_LABEL[result.grade]}
        </h1>
        <p className="mt-2 max-w-[420px] text-body text-secondary">
          {GRADE_TAGLINE[result.grade]}
        </p>
      </motion.div>

      {/* Radar over the 4 categories */}
      <div className="mt-10 flex justify-center">
        <RadarChart
          axes={CATEGORIES.map((c) => ({
            label: c.title,
            value: result.radar.find((r) => r.category === c.id)?.value ?? 0,
          }))}
          size={340}
        />
      </div>

      {/* Per-category dot bars */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {CATEGORIES.map((c) => {
          const catResult = result.perCategory.find((p) => p.category === c.id)!;
          return (
            <section key={c.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-callout font-semibold text-primary">{c.title}</h3>
                <span className="text-footnote capitalize text-brand">{catResult.grade}</span>
              </div>
              <div className="space-y-2.5">
                {skillsInCategory(c.id).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3">
                    <span className="text-footnote text-secondary">{s.label}</span>
                    <DotBar level={(scores[s.id] ?? 1) as SkillLevel} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Growth points */}
      {growth.length > 0 && (
        <section className="mt-12">
          <div className="mb-1 flex items-center gap-2 text-brand">
            <Target size={18} />
            <span className="text-footnote font-medium uppercase tracking-wide">Точки роста</span>
          </div>
          <h2 className="text-title2 font-bold text-primary">Куда расти дальше</h2>
          <p className="mt-1 text-body text-secondary">
            Начните с самых слабых навыков — так грейд растёт быстрее всего.
          </p>

          <div className="mt-6 space-y-3">
            {growth.map((skillId) => {
              const skill = SKILL_BY_ID[skillId];
              const rec = recommendationFor(skillId);
              return (
                <div key={skillId} className="rounded-xl border border-border bg-surface p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-callout font-semibold text-primary">{skill.label}</h3>
                    <DotBar level={(scores[skillId] ?? 1) as SkillLevel} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rec.lessons.map((l) => (
                      <Link
                        key={l.slug}
                        href={`/learn/${l.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-1.5 text-footnote text-primary transition-fast hover:border-brand"
                      >
                        <Sparkles size={13} className="text-brand" />
                        {l.title}
                      </Link>
                    ))}
                    {rec.video && (
                      <a
                        href={rec.video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-1.5 text-footnote text-primary transition-fast hover:border-brand"
                      >
                        <PlayCircle size={14} className="text-danger" />
                        {rec.video.title}
                      </a>
                    )}
                    {rec.lessons.length === 0 && !rec.video && (
                      <span className="text-footnote text-tertiary">
                        Материал скоро появится — спросите преподавателя
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-callout font-medium text-on-brand transition-base hover:bg-brand-hover"
        >
          Перейти к обучению <ArrowRight size={16} />
        </Link>
        <Link href="/dashboard" className="text-footnote text-tertiary hover:text-secondary">
          Открыть дашборд прогресса
        </Link>
      </div>
    </main>
  );
}

/** 🟣🟣🟣⚪️ — `level` filled brand dots out of 4. */
export function DotBar({ level }: { level: SkillLevel }) {
  return (
    <div className="flex gap-1" aria-label={`уровень ${level} из 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={[
            'h-2.5 w-2.5 rounded-full transition-fast',
            i <= level ? 'bg-brand' : 'bg-muted',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
