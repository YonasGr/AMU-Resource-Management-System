CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

CREATE TABLE "purchase_orders" (
  "id" TEXT NOT NULL,
  "order_number" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "purpose" TEXT,
  "remarks" TEXT,
  "created_by_id" TEXT NOT NULL,
  "approved_by_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "submitted_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_orders_order_number_key" ON "purchase_orders"("order_number");
CREATE INDEX "purchase_orders_supplier_id_status_idx" ON "purchase_orders"("supplier_id", "status");
CREATE INDEX "purchase_orders_store_id_status_idx" ON "purchase_orders"("store_id", "status");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "purchase_order_lines" (
  "id" TEXT NOT NULL,
  "purchase_order_id" TEXT NOT NULL,
  "material_id" TEXT NOT NULL,
  "quantity_ordered" INTEGER NOT NULL,
  "quantity_received" INTEGER NOT NULL DEFAULT 0,
  "unit_price" DECIMAL(12,2),
  "remarks" TEXT,
  CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_order_lines_purchase_order_id_material_id_key" ON "purchase_order_lines"("purchase_order_id","material_id");
CREATE INDEX "purchase_order_lines_material_id_idx" ON "purchase_order_lines"("material_id");
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_order_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_material_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "goods_receipts"
  ADD COLUMN "purchase_order_id" TEXT,
  ADD COLUMN "purchase_order_line_id" TEXT;
CREATE INDEX "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id");
CREATE INDEX "goods_receipts_purchase_order_line_id_idx" ON "goods_receipts"("purchase_order_line_id");
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_line_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
