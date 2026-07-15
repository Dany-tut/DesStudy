-- CreateEnum
CREATE TYPE "Access" AS ENUM ('PUBLIC', 'RESTRICTED');

-- AlterTable
ALTER TABLE "AuthoredLesson" ADD COLUMN     "access" "Access" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "LessonGroupAccess" (
    "lessonId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "LessonGroupAccess_pkey" PRIMARY KEY ("lessonId","groupId")
);

-- CreateTable
CREATE TABLE "LessonLearnerAccess" (
    "lessonId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,

    CONSTRAINT "LessonLearnerAccess_pkey" PRIMARY KEY ("lessonId","learnerId")
);

-- CreateIndex
CREATE INDEX "LessonGroupAccess_groupId_idx" ON "LessonGroupAccess"("groupId");

-- CreateIndex
CREATE INDEX "LessonLearnerAccess_learnerId_idx" ON "LessonLearnerAccess"("learnerId");

-- AddForeignKey
ALTER TABLE "LessonGroupAccess" ADD CONSTRAINT "LessonGroupAccess_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "AuthoredLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonGroupAccess" ADD CONSTRAINT "LessonGroupAccess_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLearnerAccess" ADD CONSTRAINT "LessonLearnerAccess_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "AuthoredLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLearnerAccess" ADD CONSTRAINT "LessonLearnerAccess_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
