import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { LearnerResultCard } from '@/components/admin/LearnerResultCard';
import type { Scores } from '@/lib/assessment/grade';

export const dynamic = 'force-dynamic';

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d);
}

/** Teacher view — latest grading-test result per learner, with radar, growth
 *  points and course attachment. */
export default async function AdminResultsPage() {
  requireAdmin();

  const [assessments, courses] = await Promise.all([
    prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { learner: { include: { enrollments: true } } },
    }),
    prisma.course.findMany({ orderBy: { title: 'asc' } }),
  ]);

  // Keep only the most recent assessment per learner (list is already desc).
  const seen = new Set<string>();
  const latest = assessments.filter((a) => {
    if (seen.has(a.learnerId)) return false;
    seen.add(a.learnerId);
    return true;
  });

  return (
    <main className="mx-auto max-w-[1000px] px-8 py-12">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-footnote text-tertiary hover:text-secondary"
      >
        <ArrowLeft size={15} /> Уроки препода
      </Link>

      <div className="mb-8 flex items-center gap-2 rounded-lg bg-warning/10 px-4 py-3 text-footnote text-warning">
        <ShieldAlert size={16} className="shrink-0" />
        Без защиты входа — временно, пока препод один.
      </div>

      <h1 className="text-title1 font-bold text-primary">Результаты теста на грейд</h1>
      <p className="mt-1 text-footnote text-secondary">
        Диагностика учеников: грейд, радар навыков, точки роста. Привяжите купленный курс, чтобы
        отслеживать прогресс.
      </p>

      <div className="mt-8 space-y-4">
        {latest.length === 0 && (
          <p className="text-body text-tertiary">Пока никто не прошёл тест.</p>
        )}
        {latest.map((a) => (
          <LearnerResultCard
            key={a.id}
            learnerId={a.learnerId}
            name={a.learner.name}
            grade={a.grade}
            scores={JSON.parse(a.scores) as Scores}
            takenAt={formatDate(a.createdAt)}
            courses={courses.map((c) => ({ id: c.id, title: c.title }))}
            enrolledCourseIds={a.learner.enrollments.map((e) => e.courseId)}
          />
        ))}
      </div>
    </main>
  );
}
