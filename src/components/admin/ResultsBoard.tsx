'use client';

import { useState } from 'react';
import { LearnerResultCard, type ApplicationInfo, type CourseOption } from './LearnerResultCard';
import type { Scores } from '@/lib/assessment/grade';

export interface ResultRow {
  id: string;
  learnerId: string;
  name: string | null;
  grade: string;
  scores: Scores;
  takenAt: string;
  enrolledCourseIds: string[];
  application: ApplicationInfo | null;
}

type Filter = 'all' | 'leads';

/** Teacher/boss results list with a "заявки" filter — flip to only the learners
 *  who left a pricing-screen application (leads to follow up on). */
export function ResultsBoard({ rows, courses }: { rows: ResultRow[]; courses: CourseOption[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const leadCount = rows.filter((r) => r.application).length;
  const shown = filter === 'leads' ? rows.filter((r) => r.application) : rows;

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'Все', count: rows.length },
    { id: 'leads', label: 'С заявкой', count: leadCount },
  ];

  return (
    <div className="mt-8">
      <div className="mb-5 inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
        {tabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={[
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-footnote font-medium transition-base',
                active ? 'bg-brand/10 text-brand' : 'text-secondary hover:bg-hover hover:text-primary',
              ].join(' ')}
            >
              {tab.label}
              <span
                className={[
                  'rounded-full px-1.5 py-0.5 text-caption tabular-nums',
                  active ? 'bg-brand/15 text-brand' : 'bg-muted text-tertiary',
                ].join(' ')}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {shown.length === 0 && (
          <p className="text-body text-tertiary">
            {filter === 'leads' ? 'Пока нет заявок от учеников.' : 'Пока никто не прошёл тест.'}
          </p>
        )}
        {shown.map((r) => (
          <LearnerResultCard
            key={r.id}
            learnerId={r.learnerId}
            name={r.name}
            grade={r.grade}
            scores={r.scores}
            takenAt={r.takenAt}
            courses={courses}
            enrolledCourseIds={r.enrolledCourseIds}
            application={r.application}
          />
        ))}
      </div>
    </div>
  );
}
