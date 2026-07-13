'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trash2, ChevronRight } from 'lucide-react';

export function LessonRow({
  id,
  slug,
  title,
  published,
  blockCount,
}: {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  blockCount: number;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm(`Удалить урок «${title}»? Это необратимо.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <Link href={`/admin/lessons/${id}`} className="flex flex-1 items-center gap-3 min-w-0">
        <span
          className={[
            'shrink-0 rounded-full px-2 py-0.5 text-caption font-medium',
            published ? 'bg-success/10 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          {published ? 'опубликован' : 'черновик'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-callout font-medium text-primary">{title}</span>
          <span className="block truncate text-caption text-tertiary">
            /{slug} · {blockCount} {blockCount === 1 ? 'блок' : 'блока'}
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-tertiary" />
      </Link>
      <button
        onClick={remove}
        disabled={deleting}
        aria-label="Удалить урок"
        className="shrink-0 rounded-lg p-2 text-tertiary transition-fast hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
