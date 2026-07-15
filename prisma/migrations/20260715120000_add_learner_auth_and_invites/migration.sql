-- CreateEnum
CREATE TYPE "LearnerInviteKind" AS ENUM ('TEST', 'LOGIN');
-- AlterTable
ALTER TABLE "Learner" ADD COLUMN     "email" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "teacherId" TEXT;
-- CreateTable
CREATE TABLE "LearnerInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "kind" "LearnerInviteKind" NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT,
    "learnerId" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearnerInvite_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "LearnerInvite_token_key" ON "LearnerInvite"("token");
-- CreateIndex
CREATE INDEX "LearnerInvite_teacherId_idx" ON "LearnerInvite"("teacherId");
-- CreateIndex
CREATE UNIQUE INDEX "Learner_email_key" ON "Learner"("email");
-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "LearnerInvite" ADD CONSTRAINT "LearnerInvite_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "LearnerInvite" ADD CONSTRAINT "LearnerInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "LearnerInvite" ADD CONSTRAINT "LearnerInvite_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
