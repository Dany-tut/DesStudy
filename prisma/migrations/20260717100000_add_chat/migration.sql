-- Two-way curator↔applicant Telegram chat.

-- Applicant's private bot chat id (set when they press Start via the deep link)
-- and the token embedded in that deep link.
ALTER TABLE "Learner" ADD COLUMN "tgChatId" TEXT;
ALTER TABLE "Learner" ADD COLUMN "tgLinkToken" TEXT;

CREATE UNIQUE INDEX "Learner_tgChatId_key" ON "Learner"("tgChatId");
CREATE UNIQUE INDEX "Learner_tgLinkToken_key" ON "Learner"("tgLinkToken");

-- Conversation, scoped to the learner.
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMessage_learnerId_createdAt_idx" ON "ChatMessage"("learnerId", "createdAt");

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_learnerId_fkey"
    FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
