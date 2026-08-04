CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

CREATE TABLE "suppliers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact_person" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "tin" TEXT,
  "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_orders" (
  "id" TEXT NOT NULL,
  "po_number" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "notes" TEXT,
  "issued_at" TIMESTAMP(3),
  "expected_delivery_date" TIMESTAMP(3),
  "supplier_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "destination_store_id" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_order_lines" (
  "id" TEXT NOT NULL,
  "ordered_quantity" INTEGER NOT NULL,
  "received_quantity" INTEGER NOT NULL DEFAULT 0,
  "unit_price" DECIMAL(18,2) NOT NULL,
  "purchase_order_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suppliers_tin_key" ON "suppliers"("tin");
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");
CREATE INDEX "purchase_orders_request_id_idx" ON "purchase_orders"("request_id");
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");
CREATE INDEX "purchase_orders_destination_store_id_idx" ON "purchase_orders"("destination_store_id");
CREATE UNIQUE INDEX "purchase_order_lines_purchase_order_id_item_id_key" ON "purchase_order_lines"("purchase_order_id", "item_id");
CREATE INDEX "purchase_order_lines_item_id_idx" ON "purchase_order_lines"("item_id");

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_destination_store_id_fkey" FOREIGN KEY ("destination_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
