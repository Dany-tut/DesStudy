import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { EditorCore } from '@/components/editor/EditorCore';

export const dynamic = 'force-dynamic';

/**
 * Editor core (milestone 2) — SVG import → layer tree + canvas + inspector.
 * Standalone harness for now; the full float-bar editor (steps ①–④) and the
 * mock FullEditor from /design-system fold in next. Staff-gated via middleware.
 */
export default async function EditorPage() {
  await requireTeacher();

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-10">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-caption font-medium text-secondary transition-fast hover:text-primary"
      >
        <ArrowLeft size={14} /> В админку
      </Link>
      <h1 className="text-title1 font-bold text-primary">Редактор экрана</h1>
      <p className="mb-8 mt-1 max-w-[640px] text-footnote text-secondary">
        Загрузи SVG — соберём дерево слоёв и покажем экран. Кликай слои в дереве или прямо на холсте:
        подсветятся друг за другом. Справа — свойства, которые вытащились из файла (радиус, фон, текст).
      </p>
      <EditorCore />
    </main>
  );
}
