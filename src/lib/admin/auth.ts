import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * Route guard for staff-only API routes. Real check now (was a no-op MVP stub):
 * verifies the session cookie via src/lib/auth. Returns a 401 response when the
 * caller isn't signed-in staff, or `null` to proceed. Usage in a handler:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 *
 * Coarse redirects for PAGES are done in middleware.ts + requireBoss/requireTeacher;
 * this is the per-request API gate.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return null;
}
