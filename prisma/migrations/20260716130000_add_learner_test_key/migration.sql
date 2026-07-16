-- Entry-test tracking: `testKey` is a short unique code surfaced to the teacher
-- so an unfinished test-taker shows up as "зашёл на тест"; `startedAt` marks
-- when the visitor clicked "Пройти тест на грейд" (before answering anything).
ALTER TABLE "Learner" ADD COLUMN "testKey" TEXT;
ALTER TABLE "Learner" ADD COLUMN "startedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Learner_testKey_key" ON "Learner"("testKey");
