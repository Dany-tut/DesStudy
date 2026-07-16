import { BookOpen } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireTeacher } from '@/lib/auth';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { GroupsManager, type GroupView, type LearnerOption } from '@/components/teacher/GroupsManager';
import { MyLessons, type LessonView } from '@/components/teacher/MyLessons';

export const dynamic = 'force-dynamic';

/**
 * Teacher cabinet (milestone 4a) — the teacher's home: their own authored
 * lessons, their learner groups, and learner management. Lesson AUTHORING still
 * lives under /admin (staff-reachable); this cabinet links into it. Access
 * scoping of lessons to groups/learners is milestone 4b.
 */
export default async function TeacherPage() {
  const user = await requireTeacher();

  const [lessons, groups, learners] = await Promise.all([
    prisma.authoredLesson.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        published: true,
        access: true,
        groupAccess: { select: { groupId: true } },
        learnerAccess: { select: { learnerId: true } },
      },
    }),
    prisma.group.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        members: { include: { learner: { select: { id: true, name: true, email: true, passwordPlain: true } } } },
      },
    }),
    // The teacher's own students (BOSS sees all). teacherId is set when a card
    // is created manually or a TEST link is claimed.
    prisma.learner.findMany({
      where: user.role === 'BOSS' ? {} : { teacherId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, passwordPlain: true },
      take: 500,
    }),
  ]);

  const groupViews: GroupView[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    members: g.members.map((m) => ({
      id: m.learner.id,
      name: m.learner.name,
      hasAccount: !!m.learner.email,
      email: m.learner.email,
      password: m.learner.passwordPlain,
    })),
  }));

  const learnerOptions: LearnerOption[] = learners.map((l) => ({
    id: l.id,
    name: l.name,
    hasAccount: !!l.email,
    email: l.email,
    password: l.passwordPlain,
  }));

  const lessonViews: LessonView[] = lessons.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    published: l.published,
    access: l.access,
    groupIds: l.groupAccess.map((g) => g.groupId),
    learnerIds: l.learnerAccess.map((a) => a.learnerId),
  }));

  return (
    <main className="mx-auto max-w-[1100px] px-8 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-title1 font-bold text-primary">Кабинет преподавателя</h1>
          <p className="mt-1 text-footnote text-secondary">
            Твои уроки, группы и ученики. Задания собираются в конструкторе уроков.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full border border-border px-3 py-1 text-caption text-secondary">
            {user.name || user.email} · {user.role === 'BOSS' ? 'админ' : 'препод'}
          </span>
          <SignOutButton />
        </div>
      </div>

      {/* My lessons + per-lesson access control */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-callout font-semibold text-primary">
          <BookOpen size={16} className="text-brand" /> Мои уроки
        </h2>
        <MyLessons lessons={lessonViews} groups={groupViews} learners={learnerOptions} />
      </section>

      {/* Groups + learners */}
      <GroupsManager initialGroups={groupViews} learners={learnerOptions} />
    </main>
  );
}
