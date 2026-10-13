ALTER TABLE "audit_logs"
ADD COLUMN "reversal_of_id" TEXT;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_reversal_of_id_fkey"
FOREIGN KEY ("reversal_of_id") REFERENCES "audit_logs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "audit_logs_reversal_of_id_idx"
ON "audit_logs"("reversal_of_id");
