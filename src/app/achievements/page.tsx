import { Trophy } from 'lucide-react';
import { CrystalGem } from '@/components/achievements/CrystalGem';
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
                'flex items-center gap-4 rounded-2xl border p-5 transition-base',
                done ? 'border-brand/40 bg-brand/[0.06]' : 'border-border bg-surface',
              ].join(' ')}
            >
              <span className="shrink-0">
                <CrystalGem tone={a.tone} locked={!done} size={64} />
              </span>
              <div>
                <p className={['text-callout font-semibold', done ? 'text-primary' : 'text-secondary'].join(' ')}>
                  {a.title}
                </p>
                <p className="mt-1 text-footnote text-tertiary">{a.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
