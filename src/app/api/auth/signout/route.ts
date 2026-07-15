import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth/session';

export const runtime = 'nodejs';

/** Clear the session cookie. POST-only to avoid drive-by GET logout. */
export async function POST() {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
