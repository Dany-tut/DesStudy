-- Contact captured on the pricing screen "оставить заявку".
ALTER TABLE "Learner" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Learner" ADD COLUMN IF NOT EXISTS "telegram" TEXT;
