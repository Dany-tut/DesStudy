import { Users, GraduationCap, ClipboardCheck, BookOpen } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireBoss } from '@/lib/auth';
import { InvitesPanel, type InviteRow } from '@/components/admin/InvitesPanel';

export const dynamic = 'force-dynamic';

/**
 * Boss admin hub. BOSS-only (the nav link is hidden from teachers and this page
 * hard-gates with requireBoss). School-wide overview: headline counts, the
 * teacher roster, and the teacher-invite panel. Lesson authoring lives in the
 * teacher cabinet (/teacher) and the per-lesson builder (/admin/lessons/[id]).
 */
export default async function AdminPage() {
  await requireBoss();

  const [teacherCount, learnerCount, assessmentCount, lessonCount, teachers, invites] =
    await Promise.all([
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
          createdAt: true,
          _count: { select: { learners: true } },
        },
      }),
      prisma.invite.findMany({
        orderBy: { createdAt: 'desc' },
        include: { usedBy: { select: { email: true } } },
      }),
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

  const stats = [
    { icon: Users, label: 'Преподаватели', value: teacherCount },
    { icon: GraduationCap, label: 'Ученики', value: learnerCount },
    { icon: ClipboardCheck, label: 'Тестов сдано', value: assessmentCount },
    { icon: BookOpen, label: 'Уроков создано', value: lessonCount },
  ];

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-12">
      <div className="mb-8">
        <h1 className="text-title1 font-bold text-primary">Админка</h1>
        <p className="mt-1 text-footnote text-secondary">
          Обзор по всей школе: преподаватели, ученики и приглашения.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon size={18} />
            </div>
            <div className="text-title1 font-bold tabular-nums text-primary">{value}</div>
            <div className="mt-0.5 text-footnote text-secondary">{label}</div>
          </div>
        ))}
      </div>

      {/* Teacher roster */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-callout font-semibold text-primary">
          <Users size={18} className="text-secondary" />
          Преподаватели
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {teachers.length === 0 ? (
            <p className="px-5 py-6 text-body text-tertiary">Пока нет ни одного аккаунта.</p>
          ) : (
            teachers.map((tch, i) => (
              <div
                key={tch.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-footnote font-semibold text-secondary">
                  {(tch.name || tch.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body font-medium text-primary">
                    {tch.name || tch.email}
                  </div>
                  <div className="truncate text-caption text-tertiary">{tch.email}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-medium ${
                    tch.role === 'BOSS'
                      ? 'bg-brand/10 text-brand'
                      : 'bg-muted text-secondary'
                  }`}
                >
                  {tch.role === 'BOSS' ? 'админ' : 'препод'}
                </span>
                <span className="shrink-0 text-footnote tabular-nums text-secondary">
                  {tch._count.learners} уч.
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Teacher invites */}
      <section>
        <h2 className="mb-3 text-callout font-semibold text-primary">Приглашения</h2>
        <InvitesPanel initial={inviteRows} />
      </section>
    </main>
  );
}
