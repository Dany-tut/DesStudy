'use client';

import { useState } from 'react';
import { GraduationCap, Plus, Check, Sparkles } from 'lucide-react';
import { RadarChart } from '@/components/assessment/RadarChart';
import { DotBar } from '@/components/assessment/ResultScreen';
import { CATEGORIES, SKILL_BY_ID, type SkillLevel } from '@/lib/assessment/taxonomy';
import { computeGrade, growthSkills, SALARY_BANDS, type Scores } from '@/lib/assessment/grade';
import { nextLevelDescriptor } from '@/lib/assessment/questions';
import { recommendationFor } from '@/lib/assessment/recommendations';
import type { Grade } from '@/lib/assessment/taxonomy';

export interface CourseOption {
  id: string;
  title: string;
}

/** The learner's pricing-screen "оставить заявку" lead, if any. */
export interface ApplicationInfo {
  plan: string;
  planLabel: string;
  status: string;
  at: string;
}

/** One learner's latest assessment for the teacher: mini radar, per-category
 *  grades, top growth points, and course attachment. */
export function LearnerResultCard({
  learnerId,
  name,
  grade,
  scores,
  takenAt,
  courses,
  enrolledCourseIds,
  application,
}: {
  learnerId: string;
  name: string | null;
  grade: string;
  scores: Scores;
  takenAt: string;
  courses: CourseOption[];
  enrolledCourseIds: string[];
  application?: ApplicationInfo | null;
}) {
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set(enrolledCourseIds));
  const [busy, setBusy] = useState<string | null>(null);
  const result = computeGrade(scores);
  const growth = growthSkills(scores, 4);

  async function toggleCourse(courseId: string) {
    const isOn = enrolled.has(courseId);
    setBusy(courseId);
    try {
      const res = await fetch('/api/admin/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId, courseId, remove: isOn }),
      });
      if (res.ok) {
        const next = new Set(enrolled);
        if (isOn) next.delete(courseId);
        else next.add(courseId);
        setEnrolled(next);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        {/* left: identity + radar */}
        <div className="flex flex-col items-center gap-3 sm:w-[220px]">
          <div className="text-center">
            <p className="text-callout font-semibold text-primary">{name ?? 'Без имени'}</p>
            <p className="text-caption text-tertiary">
              грейд <span className="capitalize text-brand">{grade}</span> · {takenAt}
            </p>
            {SALARY_BANDS[grade as Grade] && (
              <p className="mt-0.5 text-caption tabular-nums text-tertiary">
                вилка {SALARY_BANDS[grade as Grade].min}–{SALARY_BANDS[grade as Grade].max}к ₽
              </p>
            )}
            {application && (
              <span
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-caption font-medium text-brand"
                title={`Заявка на «${application.planLabel}» · ${application.at}`}
              >
                <Sparkles size={12} /> Заявка: {application.planLabel}
              </span>
            )}
          </div>
          <RadarChart
            axes={CATEGORIES.map((c) => ({
              label: c.title,
              value: result.radar.find((r) => r.category === c.id)?.value ?? 0,
            }))}
            size={200}
            animate={false}
            showLabels={false}
          />
        </div>

        {/* right: category grades + growth */}
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-3">
            {result.perCategory.map((c) => (
              <div
                key={c.category}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
              >
                <span className="text-footnote text-secondary">
                  {CATEGORIES.find((x) => x.id === c.category)!.title}
                </span>
                <span className="text-footnote capitalize text-primary">{c.grade}</span>
              </div>
            ))}
          </div>

          <h4 className="mb-2 mt-5 text-footnote font-medium text-secondary">Точки роста</h4>
          <div className="space-y-2">
            {growth.length === 0 && (
              <p className="text-footnote text-tertiary">Слабых навыков нет — крепкий профиль.</p>
            )}
            {growth.map((skillId) => {
              const level = (scores[skillId] ?? 1) as SkillLevel;
              const target = nextLevelDescriptor(skillId, level) ?? recommendationFor(skillId).lessons[0]?.title;
              return (
                <div key={skillId} className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-footnote text-primary">{SKILL_BY_ID[skillId].label}</span>
                  <div className="flex items-center gap-3">
                    <span className="max-w-[260px] truncate text-caption text-tertiary" title={target}>
                      → {target ?? '—'}
                    </span>
                    <DotBar level={level} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* course attachment */}
      {courses.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-2 flex items-center gap-2 text-footnote text-secondary">
            <GraduationCap size={15} className="text-brand" />
            Купленные курсы
          </div>
          <div className="flex flex-wrap gap-2">
            {courses.map((course) => {
              const on = enrolled.has(course.id);
              return (
                <button
                  key={course.id}
                  type="button"
                  disabled={busy === course.id}
                  onClick={() => toggleCourse(course.id)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-footnote transition-fast disabled:opacity-50',
                    on
                      ? 'border-brand bg-brand/10 text-primary'
                      : 'border-border bg-canvas text-secondary hover:border-border-strong',
                  ].join(' ')}
                >
                  {on ? <Check size={13} className="text-brand" /> : <Plus size={13} />}
                  {course.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
