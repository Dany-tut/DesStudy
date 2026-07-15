import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireTeacher } from '@/lib/auth';
import { ResultsBoard, type ResultRow } from '@/components/admin/ResultsBoard';
import type { Scores } from '@/lib/assessment/grade';

export const dynamic = 'force-dynamic';

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d);
}

/** Pricing-screen tariff ids → the label the learner saw (PricingPlans). */
const PLAN_LABEL: Record<string, string> = {
  self: 'Самостоятельно',
  mentor: 'С ментором',
  job: 'До оффера',
};

/** Teacher view — latest grading-test result per learner, with radar, growth
 *  points and course attachment. Scoped to the teacher's own students; BOSS
 *  sees everyone, including legacy anonymous test-takers. */
export default async function AdminResultsPage() {
  const user = await requireTeacher();

  // Only assessments of learners this teacher owns (BOSS: all).
  const assessmentWhere: Prisma.AssessmentWhereInput =
    user.role === 'BOSS' ? {} : { learner: { teacherId: user.id } };

  const [assessments, courses] = await Promise.all([
    prisma.assessment.findMany({
      where: assessmentWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        learner: {
          include: {
            enrollments: true,
            applications: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
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

  const rows: ResultRow[] = latest.map((a) => {
    const app = a.learner.applications[0];
    return {
      id: a.id,
      learnerId: a.learnerId,
      name: a.learner.name,
      grade: a.grade,
      scores: JSON.parse(a.scores) as Scores,
      takenAt: formatDate(a.createdAt),
      enrolledCourseIds: a.learner.enrollments.map((e) => e.courseId),
      application: app
        ? {
            plan: app.plan,
            planLabel: PLAN_LABEL[app.plan] ?? app.plan,
            status: app.status,
            at: formatDate(app.createdAt),
          }
        : null,
    };
  });

  return (
    <main className="mx-auto max-w-[1000px] px-8 py-12">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-footnote text-tertiary hover:text-secondary"
      >
        <ArrowLeft size={15} /> Уроки препода
      </Link>

      <h1 className="text-title1 font-bold text-primary">Результаты теста на грейд</h1>
      <p className="mt-1 text-footnote text-secondary">
        Диагностика учеников: грейд, радар навыков, точки роста. Привяжите купленный курс, чтобы
        отслеживать прогресс.
      </p>

      <ResultsBoard rows={rows} courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
    </main>
  );
}
