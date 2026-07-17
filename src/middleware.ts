import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { LEARNER_SESSION_COOKIE, verifyLearnerSession } from '@/lib/auth/learner-session';

/**
 * Runs on the edge for every page request. Two jobs:
 *
 *  1. Expose the request path to Server Components via the `x-pathname` header,
 *     so the root layout can pick the right chrome (shell vs. bare flow).
 *  2. Coarse page-level access control — it only verifies the session JWT
 *     (identity travels inside the token, no DB hit). Fine-grained checks and
 *     the typed `user` for rendering live in the pages via requireBoss/
 *     requireTeacher (src/lib/auth).
 *
 *       /admin/*, /teacher/*   → any signed-in staff.
 *       /student/*, course/*   → any signed-in learner (separate session cookie).
 *
 * Everything else is public and passes through untouched (still tagged).
 */

/** Learner-only areas — the paid course. Gated behind the learner session. */
const LEARNER_PREFIXES = ['/student', '/learn', '/dashboard', '/achievements', '/library', '/mentor'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);
  const pass = NextResponse.next({ request: { headers: requestHeaders } });

  if (LEARNER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const token = req.cookies.get(LEARNER_SESSION_COOKIE)?.value;
    const learner = token ? await verifyLearnerSession(token) : null;
    if (!learner) return redirectToSignin(req, pathname);
    return pass;
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/teacher')) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const user = token ? await verifySession(token) : null;
    if (!user) return redirectToSignin(req, pathname);
    return pass;
  }

  return pass;
}

function redirectToSignin(req: NextRequest, next: string) {
  const url = new URL('/signin', req.url);
  url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on all pages except Next internals and static assets (anything with a
  // file extension), so `x-pathname` is set for every rendered route.
  //
  // `api` is excluded on purpose: API routes render no chrome (they don't need
  // `x-pathname`) and do their own `requireAdmin`/auth, so middleware has no job
  // there. Crucially, any route middleware touches is capped at Next's default
  // 10MB request-body limit and silently TRUNCATED past it — which corrupted the
  // gzipped screen autosave (`/api/admin/lessons/[id]/screen`) on large files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
