CREATE TYPE "ReceiptStatus" AS ENUM ('DRAFT', 'INSPECTED', 'POSTED', 'REJECTED');

CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "receipt_code" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "quantity_received" INTEGER NOT NULL,
    "quantity_accepted" INTEGER NOT NULL DEFAULT 0,
    "quantity_rejected" INTEGER NOT NULL DEFAULT 0,
    "condition" TEXT,
    "delivery_reference" TEXT,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "inspected_by_id" TEXT,
    "inspected_at" TIMESTAMP(3),
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "goods_receipts_receipt_code_key" ON "goods_receipts"("receipt_code");
CREATE INDEX "goods_receipts_store_id_status_idx" ON "goods_receipts"("store_id", "status");
CREATE INDEX "goods_receipts_supplier_id_idx" ON "goods_receipts"("supplier_id");
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_inspected_by_id_fkey" FOREIGN KEY ("inspected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
