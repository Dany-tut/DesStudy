import { requireTeacher } from '@/lib/auth';
import { EditorCore } from '@/components/editor/EditorCore';

export const dynamic = 'force-dynamic';

/**
 * The screen editor — a full-bleed, fixed-viewport workspace (Figma-style): the
 * layers panel is flush to the left edge, properties flush to the right, the
 * infinite grid canvas fills the middle. The page itself never scrolls — only
 * the side panels do; the canvas pans and zooms. Staff-gated via middleware.
 *
 * Height = viewport minus the 64px (`h-16`) sticky TopHeader.
 */
export default async function EditorPage() {
  await requireTeacher();

  return (
    <main className="h-[calc(100vh-4rem)] overflow-hidden">
      <EditorCore />
    </main>
  );
}
