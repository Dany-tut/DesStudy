import { notFound } from 'next/navigation';
import { getLesson } from '@/lib/curriculum/resolve';
import { getLocale } from '@/lib/i18n/server';
import { LessonPageClient } from '@/components/lesson/LessonPageClient';

export const dynamic = 'force-dynamic';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const lesson = await getLesson(slug, locale);
  if (!lesson) notFound();

  return <LessonPageClient lesson={lesson} />;
}
