import { cookies } from 'next/headers';
import { prisma } from './db';

const COOKIE = 'learner';

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
