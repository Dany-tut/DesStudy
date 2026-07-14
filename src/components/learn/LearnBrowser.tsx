'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LessonCard } from '@/components/learn/LessonCard';
import type { LessonEntry, Level } from '@/content/curriculum';

export interface LearnGroupLesson {
  entry: LessonEntry;
  progressPct: number;
  completed?: boolean;
}

export interface LearnGroup {
  id: string;
  title: string;
  description: string;
  emoji: string;
  lessons: LearnGroupLesson[];
}

type LevelFilter = 'all' | Level;
type StatusFilter = 'all' | 'new' | 'progress' | 'done';

/**
 * All the client interactivity for /learn — search + filters. The page
 * itself stays a server component (real Prisma progress data); this just
 * filters the already-fetched list, no new API needed.
 */
export function LearnBrowser({ groups }: { groups: LearnGroup[] }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        lessons: g.lessons.filter(({ entry, progressPct, completed }) => {
          if (q && !entry.title.toLowerCase().includes(q)) return false;
          if (level !== 'all' && entry.level !== level) return false;
          if (status === 'done' && !completed) return false;
          if (status === 'progress' && (completed || progressPct === 0)) return false;
          if (status === 'new' && (completed || progressPct > 0)) return false;
          return true;
        }),
      }))
      .filter((g) => g.lessons.length > 0);
  }, [groups, query, level, status]);

  const totalMatches = filteredGroups.reduce((n, g) => n + g.lessons.length, 0);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск урока…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={level}
            onChange={setLevel}
            options={[
              { value: 'all', label: 'Все уровни' },
              { value: 'beginner', label: 'Начальный' },
              { value: 'medium', label: 'Средний' },
              { value: 'advanced', label: 'Продвинутый' },
            ]}
          />
          <SegmentedControl
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'new', label: 'Не начато' },
              { value: 'progress', label: 'В процессе' },
              { value: 'done', label: 'Пройдено' },
            ]}
          />
        </div>
      </div>

      {totalMatches === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong py-10 text-center text-body text-tertiary">
          Ничего не нашлось — попробуй другой запрос или сними фильтр.
        </p>
      ) : (
        <div className="space-y-10">
          {filteredGroups.map((g) => (
            <section key={g.id}>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xl">{g.emoji}</span>
                <div>
                  <h2 className="text-title3 font-semibold text-primary">{g.title}</h2>
                  <p className="text-caption text-tertiary">{g.description}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {g.lessons.map(({ entry, progressPct, completed }) => (
                  <LessonCard
                    key={entry.slug}
                    lesson={entry}
                    progressPct={progressPct}
                    completed={completed}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
