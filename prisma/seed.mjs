// Seed the single BOSS account from env. Idempotent: re-running updates the
// password/name for the same email rather than creating duplicates.
// Run via `npm run seed` (→ prisma db seed, which loads .env first).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOSS_EMAIL?.trim().toLowerCase();
  const password = process.env.BOSS_PASSWORD;
  const name = process.env.BOSS_NAME?.trim() || null;

  if (!email || !password) {
    throw new Error('Set BOSS_EMAIL and BOSS_PASSWORD in .env before seeding.');
  }
  if (password.length < 8) {
    throw new Error('BOSS_PASSWORD must be at least 8 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: 'BOSS' },
    create: { email, passwordHash, name, role: 'BOSS' },
  });

  console.log(`✓ BOSS ready: ${user.email}`);

  // Backfill: legacy lessons authored before ownership existed → the boss, so
  // the teacher cabinet's "my lessons" never leaves them orphaned.
  const backfilled = await prisma.authoredLesson.updateMany({
    where: { authorId: null },
    data: { authorId: user.id },
  });
  if (backfilled.count > 0) console.log(`✓ Backfilled ${backfilled.count} lesson(s) → boss`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
