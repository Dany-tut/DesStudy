import { Trophy, Lock } from 'lucide-react';
import { getLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { totalLessons } from '@/content/curriculum';
import { ACHIEVEMENTS, type AchievementStats } from '@/content/achievements';
import { ComingSoon } from '@/components/shell/ComingSoon';

export const dynamic = 'force-dynamic';

export default async function AchievementsPage() {
  const learner = await getLearner();

  if (!learner) {
    return (
      <ComingSoon
        title="Достижения"
        description="Пройди первое упражнение, и здесь появятся бейджи за прогресс."
        icon={<Trophy size={28} />}
      />
    );
  }

  const [lessons, skills, firstTryCount] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { learnerId: learner.id } }),
    prisma.skillStat.findMany({ where: { learnerId: learner.id } }),
    prisma.attempt.count({ where: { learnerId: learner.id, correct: true, tries: 1 } }),
  ]);

  const stats: AchievementStats = {
    xp: learner.xp,
    streak: learner.streak,
    lessonsCompleted: lessons.filter((l) => l.completed).length,
    totalLessons,
    skills: skills.map((s) => ({ skill: s.skill, solved: s.solved, totalTries: s.totalTries })),
    firstTryCount,
  };

  const unlocked = ACHIEVEMENTS.filter((a) => a.check(stats));
  const unlockedIds = new Set(unlocked.map((a) => a.id));

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-16">
      <h1 className="text-title1 font-bold text-primary">Достижения</h1>
      <p className="mt-2 text-body text-secondary">
        {unlocked.length} из {ACHIEVEMENTS.length} бейджей разблокировано.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const done = unlockedIds.has(a.id);
          return (
            <div
              key={a.id}
              className={[
                'flex items-start gap-4 rounded-xl border p-5 transition-base',
                done ? 'border-brand bg-brand/10' : 'border-border bg-surface opacity-60',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl',
                  done ? 'bg-brand/10' : 'bg-muted grayscale',
                ].join(' ')}
              >
                {done ? a.emoji : <Lock size={18} className="text-tertiary" />}
              </span>
              <div>
                <p className="text-callout font-semibold text-primary">{a.title}</p>
                <p className="mt-1 text-footnote text-tertiary">{a.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
