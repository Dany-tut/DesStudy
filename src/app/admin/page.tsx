import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireTeacher } from '@/lib/auth';
import { CreateLessonForm } from '@/components/admin/CreateLessonForm';
import { LessonRow } from '@/components/admin/LessonRow';
import { InvitesPanel, type InviteRow } from '@/components/admin/InvitesPanel';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const dynamic = 'force-dynamic';

/**
 * Admin / staff home. Real auth now (middleware guards /admin, this page
 * resolves the typed user). Lesson authoring is shown to all staff; the
 * teacher-invite panel is BOSS-only. A dedicated /teacher cabinet comes later.
 */
export default async function AdminPage() {
  const user = await requireTeacher();
  const isBoss = user.role === 'BOSS';

  const [rows, invites] = await Promise.all([
    prisma.authoredLesson.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { blocks: true } } },
    }),
    isBoss
      ? prisma.invite.findMany({
          orderBy: { createdAt: 'desc' },
          include: { usedBy: { select: { email: true } } },
        })
      : Promise.resolve([]),
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

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-title1 font-bold text-primary">
            {isBoss ? 'Админка' : 'Кабинет преподавателя'}
          </h1>
          <p className="mt-1 text-footnote text-secondary">
            Собери урок из блоков — теория, видео, задания — и опубликуй его для учеников.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full border border-border px-3 py-1 text-caption text-secondary">
            {user.name || user.email} · {isBoss ? 'админ' : 'препод'}
          </span>
          <Link
            href="/admin/results"
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-footnote font-medium text-primary transition-base hover:border-brand"
          >
            Результаты теста на грейд →
          </Link>
          <SignOutButton />
        </div>
      </div>

      {isBoss && (
        <div className="mb-10">
          <InvitesPanel initial={inviteRows} />
        </div>
      )}

      <div className="mt-8">
        <CreateLessonForm />
      </div>

      <div className="mt-10 space-y-2">
        {rows.length === 0 && (
          <p className="text-body text-tertiary">Пока нет ни одного урока — начни выше.</p>
        )}
        {rows.map((r) => (
          <LessonRow
            key={r.id}
            id={r.id}
            slug={r.slug}
            title={r.title}
            published={r.published}
            blockCount={r._count.blocks}
          />
        ))}
      </div>

      <p className="mt-10 text-caption text-tertiary">
        Опубликованные уроки появляются на{' '}
        <Link href="/learn" className="text-brand hover:underline">
          /learn
        </Link>{' '}
        рядом со статичными.
      </p>
    </main>
  );
}
