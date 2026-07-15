import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

/**
 * Coarse page-level access control. Runs on the edge, so it only verifies the
 * session JWT (role travels inside the token — no DB hit). Fine-grained checks
 * and the typed `user` for rendering live in the pages via requireBoss/
 * requireTeacher (src/lib/auth). Learners and public pages are untouched.
 *
 *   /admin/* → any signed-in staff. Boss-only areas (invites, teachers) are
 *   gated inside the page by role; a dedicated /teacher cabinet comes later.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;

  if (!user) {
    const url = new URL('/signin', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
