import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireTeacher } from '@/lib/auth';
import { TestingBoard, type StudentCard } from '@/components/teacher/TestingBoard';
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

/**
 * Testing view — the teacher's students as a grid of mini cards (grade + radar
 * + account state); clicking one opens the detailed breakdown. Scoped to the
 * teacher's own learners (`teacherId`); BOSS sees every card, including the
 * legacy anonymous test-takers with no owner.
 */
export default async function TeacherTestingPage() {
  const user = await requireTeacher();

  const where: Prisma.LearnerWhereInput =
    user.role === 'BOSS' ? {} : { teacherId: user.id };

  const [learners, courses] = await Promise.all([
    prisma.learner.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assessments: { orderBy: { createdAt: 'desc' }, take: 1 },
        enrollments: { select: { courseId: true } },
        applications: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      take: 500,
    }),
    prisma.course.findMany({ orderBy: { title: 'asc' } }),
  ]);

  const students: StudentCard[] = learners.map((l) => {
    const latest = l.assessments[0];
    let scores: Scores | null = null;
    if (latest) {
      try {
        scores = JSON.parse(latest.scores) as Scores;
      } catch {
        scores = null;
      }
    }
    const app = l.applications[0];
    return {
      id: l.id,
      name: l.name,
      hasAccount: !!l.email,
      grade: latest?.grade ?? null,
      scores,
      takenAt: latest ? formatDate(latest.createdAt) : null,
      enrolledCourseIds: l.enrollments.map((e) => e.courseId),
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
    <main className="mx-auto max-w-[1100px] px-8 py-12">
      <Link
        href="/teacher"
        className="mb-6 inline-flex items-center gap-1.5 text-footnote text-tertiary hover:text-secondary"
      >
        <ArrowLeft size={15} /> Кабинет
      </Link>

      <h1 className="text-title1 font-bold text-primary">Тестирование</h1>
      <p className="mt-1 text-footnote text-secondary">
        Ученики, грейд и точки роста. Выдайте ссылку на тест, добавьте карточку и пришлите ученику
        ссылку на вход.
      </p>

      <TestingBoard
        students={students}
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
      />
    </main>
  );
}
