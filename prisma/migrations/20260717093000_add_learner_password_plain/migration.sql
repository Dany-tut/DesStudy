-- Plaintext copy of the learner's password, shown to the teacher in /admin so
-- they can hand credentials back. Existed only in the schema (applied locally
-- via `prisma db push`) with no migration — prod was missing the column, which
-- broke every `prisma.learner.findMany()` (Prisma selects all scalars).
-- IF NOT EXISTS guards against DBs where db push already added it.
ALTER TABLE "Learner" ADD COLUMN IF NOT EXISTS "passwordPlain" TEXT;
