import { notFound } from 'next/navigation';
import { getLesson } from '@/lib/curriculum/resolve';
import { getNextLesson } from '@/content/curriculum';
import { getLocale } from '@/lib/i18n/server';
import { getCurrentLearner } from '@/lib/learner';
import { LessonPageClient } from '@/components/lesson/LessonPageClient';

export const dynamic = 'force-dynamic';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const learner = await getCurrentLearner();
  const lesson = await getLesson(slug, locale, learner?.id ?? null);
  if (!lesson) notFound();

  const nextLesson = getNextLesson(slug, locale);

  return <LessonPageClient lesson={lesson} nextLesson={nextLesson} />;
}
