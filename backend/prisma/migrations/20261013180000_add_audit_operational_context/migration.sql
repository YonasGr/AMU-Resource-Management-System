ALTER TABLE "audit_logs"
ADD COLUMN "store_id" TEXT,
ADD COLUMN "device_id" TEXT;

CREATE INDEX "audit_logs_store_id_created_at_idx"
ON "audit_logs"("store_id", "created_at");

CREATE INDEX "audit_logs_device_id_created_at_idx"
ON "audit_logs"("device_id", "created_at");
