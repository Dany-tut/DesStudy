import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { LessonBuilder } from '@/components/admin/LessonBuilder';

export const dynamic = 'force-dynamic';

export default async function AdminLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await prisma.authoredLesson.findUnique({
    where: { id },
    include: { blocks: { orderBy: { order: 'asc' } } },
  });
  if (!lesson) notFound();

  return (
    <LessonBuilder
      lesson={{
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        pathTitle: lesson.pathTitle,
        skill: lesson.skill,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        objectives: JSON.parse(lesson.objectives),
        prerequisites: JSON.parse(lesson.prerequisites),
        published: lesson.published,
      }}
      initialBlocks={lesson.blocks.map((b) => ({
        id: b.id,
        kind: b.kind,
        order: b.order,
        payload: JSON.parse(b.payload),
      }))}
    />
  );
}
