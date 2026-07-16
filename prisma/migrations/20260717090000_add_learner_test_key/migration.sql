-- Landing "Пройти тест на грейд": short human-readable key + entry timestamp,
-- so an unfinished test-taker shows up as "зашёл на тест" in the teacher view.
-- IF NOT EXISTS guards against columns already created locally via `prisma db push`.
ALTER TABLE "Learner" ADD COLUMN IF NOT EXISTS "testKey" TEXT;
ALTER TABLE "Learner" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Learner_testKey_key" ON "Learner"("testKey");
