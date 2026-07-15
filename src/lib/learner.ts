import { cookies } from 'next/headers';
import { prisma } from './db';
import { LEARNER_SESSION_COOKIE, verifyLearnerSession } from './auth/learner-session';

const COOKIE = 'learner';

/**
 * Resolve the current *authenticated* learner from the learner-session cookie
 * (set after claiming a LOGIN invite — src/lib/auth/learner-session.ts). Returns
 * null for anonymous/guest learners, who keep the plain `learner` cookie below.
 */
export async function getSessionLearner() {
  const token = (await cookies()).get(LEARNER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyLearnerSession(token);
  if (!session) return null;
  return prisma.learner.findUnique({ where: { id: session.id } });
}

/**
 * The effective learner for a request: the signed-in learner if there is one,
 * otherwise the anonymous cookie learner (creating one on first visit). This is
 * what content/assessment flows should use so a logged-in student and a guest
 * both resolve to the right card.
 */
export async function getCurrentLearner() {
  return (await getSessionLearner()) ?? (await getOrCreateLearner());
}

/**
 * Resolve the current learner from the `learner` cookie, creating one on first
 * visit. Cookie-based anonymous identity — real auth (Auth.js) comes later.
 * Must be called from a Server Component / Route Handler (uses next/headers).
 */
export async function getOrCreateLearner() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;

  if (id) {
    const existing = await prisma.learner.findUnique({ where: { id } });
    if (existing) return existing;
  }

  const learner = await prisma.learner.create({ data: {} });
  jar.set(COOKIE, learner.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  return learner;
}

/** Read-only lookup — returns null if no learner cookie yet (no mutation). */
export async function getLearner() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  return prisma.learner.findUnique({ where: { id } });
}

/**
 * A learner is a *registered* student once a teacher has linked them to a
 * purchased course (≥1 Enrollment). Until then they're a guest: their ФИ and
 * grade still reach curators via /admin/results, but they see the marketing
 * shell (no app sidebar, pricing instead of learning CTAs). Progress attaches
 * later when the teacher enrolls them from the student/test card.
 */
export async function isRegisteredLearner(): Promise<boolean> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return false;
  const count = await prisma.enrollment.count({ where: { learnerId: id } });
  return count > 0;
}
