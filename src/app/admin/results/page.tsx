import { redirect } from 'next/navigation';

/** "Результаты" folded into "Тестирование" — the testing grid now opens each
 *  learner's full grade breakdown (radar, growth points, lead) in a modal.
 *  Keep this route as a redirect so old links and bookmarks land on the merged
 *  view. */
export default function AdminResultsPage() {
  redirect('/teacher/testing');
}
