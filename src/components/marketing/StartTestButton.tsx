'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';

/**
 * Landing CTA into the entry grading test. Before routing, it pings
 * /api/assessment/start so the visitor is stamped "зашёл на тест" (a
 * self-generated key + card) the instant they enter — even if they never
 * finish. Best-effort: a failed ping never blocks getting to the test.
 */
export function StartTestButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      await fetch('/api/assessment/start', { method: 'POST' });
    } catch {
      // ignore — never block the learner from reaching the test
    }
    router.push('/assessment');
  }

  return (
    <button type="button" onClick={start} disabled={busy} className={className}>
      Пройти тест на грейд {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
    </button>
  );
}
