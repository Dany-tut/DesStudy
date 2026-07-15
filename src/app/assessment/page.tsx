import { getLearner } from '@/lib/learner';
import { AssessmentPlayer } from '@/components/assessment/AssessmentPlayer';

export const dynamic = 'force-dynamic';

/**
 * Entry grading test — everyone who lands on the platform takes it. If the
 * learner hasn't introduced themselves yet, the player opens with the ФИ step;
 * the result is persisted and surfaced to the teacher in /admin/results.
 */
export default async function AssessmentPage() {
  const learner = await getLearner();
  return <AssessmentPlayer initialName={learner?.name ?? null} />;
}
