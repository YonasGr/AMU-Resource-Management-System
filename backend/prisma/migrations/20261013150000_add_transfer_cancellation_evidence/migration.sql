ALTER TABLE "inventory_transfers"
ADD COLUMN "cancelled_by_id" TEXT,
ADD COLUMN "cancelled_at" TIMESTAMP(3),
ADD COLUMN "cancellation_reason_code" TEXT,
ADD COLUMN "cancellation_remarks" TEXT;

ALTER TABLE "inventory_transfers"
ADD CONSTRAINT "inventory_transfers_cancelled_by_id_fkey"
FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "inventory_transfers_cancelled_by_id_idx"
ON "inventory_transfers"("cancelled_by_id");
