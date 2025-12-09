-- Add fields for highest supported E/M code and confidence
ALTER TABLE "Encounter"
ADD COLUMN IF NOT EXISTS "aiEmHighestSupportedCode" TEXT,
ADD COLUMN IF NOT EXISTS "aiEmHighestSupportedConfidence" DOUBLE PRECISION;

