import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { prisma } from '@/lib/db';
import { CreateLessonForm } from '@/components/admin/CreateLessonForm';
import { LessonRow } from '@/components/admin/LessonRow';

export const dynamic = 'force-dynamic';

/**
 * Admin — lesson list. No login gate yet (see src/lib/admin/auth.ts):
 * anyone with the URL can reach this. Fine for the current single-teacher MVP;
 * the banner below is the only thing standing in for real access control.
 */
export default async function AdminPage() {
  const rows = await prisma.authoredLesson.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { blocks: true } } },
  });

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-12">
      <div className="mb-8 flex items-center gap-2 rounded-lg bg-warning/10 px-4 py-3 text-footnote text-warning">
        <ShieldAlert size={16} className="shrink-0" />
        Без защиты входа — временно, пока препод один. Не делись этой ссылкой.
      </div>

      <h1 className="text-title1 font-bold text-primary">Уроки препода</h1>
      <p className="mt-1 text-footnote text-secondary">
        Собери урок из блоков — теория, видео, задания — и опубликуй его для учеников.
      </p>

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
