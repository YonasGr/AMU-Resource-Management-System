CREATE TYPE "InventoryCondition" AS ENUM ('NEW', 'GOOD', 'DAMAGED', 'QUARANTINED', 'SCRAPPED');

ALTER TABLE "materials"
  ADD COLUMN "requires_lot_tracking" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requires_expiry_tracking" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requires_serial_tracking" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "goods_receipts"
  ADD COLUMN "lot_number" TEXT,
  ADD COLUMN "batch_number" TEXT,
  ADD COLUMN "expiry_date" TIMESTAMP(3),
  ADD COLUMN "serial_number" TEXT;

ALTER TABLE "material_returns"
  ADD COLUMN "lot_number" TEXT,
  ADD COLUMN "batch_number" TEXT,
  ADD COLUMN "expiry_date" TIMESTAMP(3),
  ADD COLUMN "serial_number" TEXT;

ALTER TABLE "inventory_transfers"
  ADD COLUMN "lot_number" TEXT,
  ADD COLUMN "batch_number" TEXT,
  ADD COLUMN "expiry_date" TIMESTAMP(3);

ALTER TABLE "inventory_transactions"
  ADD COLUMN "lot_number" TEXT,
  ADD COLUMN "batch_number" TEXT,
  ADD COLUMN "expiry_date" TIMESTAMP(3),
  ADD COLUMN "serial_number" TEXT,
  ADD COLUMN "condition" "InventoryCondition";

CREATE INDEX "goods_receipts_lot_number_idx" ON "goods_receipts"("lot_number");
CREATE INDEX "goods_receipts_expiry_date_idx" ON "goods_receipts"("expiry_date");
CREATE INDEX "inventory_transactions_lot_number_idx" ON "inventory_transactions"("lot_number");
CREATE INDEX "inventory_transactions_expiry_date_idx" ON "inventory_transactions"("expiry_date");
