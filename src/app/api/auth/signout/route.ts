import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { LEARNER_SESSION_COOKIE } from '@/lib/auth/learner-session';

export const runtime = 'nodejs';

/** Clear both session cookies (staff + learner). POST-only to avoid drive-by
 *  GET logout. Clearing the one a viewer doesn't have is a harmless no-op. */
export async function POST() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(LEARNER_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
