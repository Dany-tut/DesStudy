import { prisma } from '@/lib/db';
import { requireBoss } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';
import { AdminDashboard, type AdminData } from '@/components/admin/AdminDashboard';
import type { InviteRow } from '@/components/admin/InvitesPanel';
import { loadApplicationRows } from '@/lib/admin/applications';

export const dynamic = 'force-dynamic';

/**
 * Boss admin hub. BOSS-only (the nav link is hidden from teachers and this page
 * hard-gates with requireBoss). School-wide overview split into tabs
 * (Пользователи / Заявки / Аналитика / Ошибки) inside AdminDashboard. Lesson
 * authoring lives in the teacher cabinet (/teacher) and the per-lesson builder.
 */
export default async function AdminPage() {
  await requireBoss();
  const { t } = await getT();

  const [
    teacherCount,
    learnerCount,
    assessmentCount,
    lessonCount,
    teachers,
    invites,
    applicationRows,
    grades,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.learner.count(),
    prisma.assessment.count(),
    prisma.authoredLesson.count(),
    prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: { select: { learners: true } },
      },
    }),
    prisma.invite.findMany({
      orderBy: { createdAt: 'desc' },
      include: { usedBy: { select: { email: true } } },
    }),
    loadApplicationRows(),
    prisma.assessment.groupBy({ by: ['grade'], _count: { grade: true } }),
  ]);

  const inviteRows: InviteRow[] = invites.map((i) => ({
    id: i.id,
    token: i.token,
    email: i.email,
    used: !!i.usedById,
    usedByEmail: i.usedBy?.email ?? null,
    expiresAt: i.expiresAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  }));

  const gradeCount = (g: string) =>
    grades.find((row) => row.grade === g)?._count.grade ?? 0;

  const data: AdminData = {
    stats: { teacherCount, learnerCount, assessmentCount, lessonCount },
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      role: t.role,
      learnerCount: t._count.learners,
    })),
    invites: inviteRows,
    applications: applicationRows,
    gradeDistribution: {
      junior: gradeCount('junior'),
      middle: gradeCount('middle'),
      senior: gradeCount('senior'),
    },
  };

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-12">
      <div className="mb-8">
        <h1 className="text-title1 font-bold text-primary">{t('admin.pageTitle')}</h1>
        <p className="mt-1 text-footnote text-secondary">{t('admin.pageSubtitle')}</p>
      </div>
      <AdminDashboard data={data} />
    </main>
  );
}
