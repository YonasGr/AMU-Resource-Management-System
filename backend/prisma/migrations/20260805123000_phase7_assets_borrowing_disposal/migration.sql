CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'BORROWED', 'UNDER_INSPECTION', 'UNDER_MAINTENANCE', 'DISPOSED');
CREATE TYPE "AssetEventType" AS ENUM ('REGISTERED', 'ASSIGNED', 'UNASSIGNED', 'BORROW_APPROVED', 'BORROW_ISSUED', 'BORROW_RETURNED', 'BORROW_INSPECTED', 'DISPOSED', 'UPDATED');
CREATE TYPE "BorrowStatus" AS ENUM ('APPROVED', 'ISSUED', 'RETURNED_PENDING_INSPECTION', 'COMPLETED');

CREATE TABLE "assets" (
  "id" TEXT NOT NULL,
  "asset_tag" TEXT NOT NULL,
  "serial_number" TEXT,
  "purchase_date" DATE,
  "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
  "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
  "notes" TEXT,
  "item_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "assigned_organization_id" TEXT,
  "goods_receipt_line_id" TEXT,
  "registered_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asset_history" (
  "id" TEXT NOT NULL,
  "event_type" "AssetEventType" NOT NULL,
  "details" JSONB,
  "asset_id" TEXT NOT NULL,
  "acted_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "borrow_transactions" (
  "id" TEXT NOT NULL,
  "status" "BorrowStatus" NOT NULL DEFAULT 'APPROVED',
  "purpose" TEXT NOT NULL,
  "expected_return_date" DATE NOT NULL,
  "issued_at" TIMESTAMP(3),
  "returned_at" TIMESTAMP(3),
  "inspected_at" TIMESTAMP(3),
  "issue_notes" TEXT,
  "return_notes" TEXT,
  "inspection_notes" TEXT,
  "return_condition" "AssetCondition",
  "request_id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "borrower_id" TEXT NOT NULL,
  "issued_by" TEXT,
  "returned_by" TEXT,
  "inspected_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "borrow_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "disposal_records" (
  "id" TEXT NOT NULL,
  "certificate_number" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "inspection_notes" TEXT,
  "disposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "request_id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "disposed_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "disposal_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assets_asset_tag_key" ON "assets"("asset_tag");
CREATE UNIQUE INDEX "assets_serial_number_key" ON "assets"("serial_number");
CREATE INDEX "assets_item_id_idx" ON "assets"("item_id");
CREATE INDEX "assets_store_id_idx" ON "assets"("store_id");
CREATE INDEX "assets_assigned_organization_id_idx" ON "assets"("assigned_organization_id");
CREATE INDEX "assets_goods_receipt_line_id_idx" ON "assets"("goods_receipt_line_id");
CREATE INDEX "assets_status_idx" ON "assets"("status");
CREATE INDEX "asset_history_asset_id_created_at_idx" ON "asset_history"("asset_id", "created_at");
CREATE UNIQUE INDEX "borrow_transactions_request_id_key" ON "borrow_transactions"("request_id");
CREATE INDEX "borrow_transactions_asset_id_idx" ON "borrow_transactions"("asset_id");
CREATE INDEX "borrow_transactions_borrower_id_idx" ON "borrow_transactions"("borrower_id");
CREATE INDEX "borrow_transactions_store_id_idx" ON "borrow_transactions"("store_id");
CREATE INDEX "borrow_transactions_status_idx" ON "borrow_transactions"("status");
CREATE UNIQUE INDEX "disposal_records_certificate_number_key" ON "disposal_records"("certificate_number");
CREATE UNIQUE INDEX "disposal_records_request_id_key" ON "disposal_records"("request_id");
CREATE UNIQUE INDEX "disposal_records_asset_id_key" ON "disposal_records"("asset_id");
CREATE INDEX "disposal_records_store_id_idx" ON "disposal_records"("store_id");

ALTER TABLE "assets" ADD CONSTRAINT "assets_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_assigned_organization_id_fkey" FOREIGN KEY ("assigned_organization_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_goods_receipt_line_id_fkey" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "goods_receipt_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "borrow_transactions" ADD CONSTRAINT "borrow_transactions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "borrow_transactions" ADD CONSTRAINT "borrow_transactions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "borrow_transactions" ADD CONSTRAINT "borrow_transactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "borrow_transactions" ADD CONSTRAINT "borrow_transactions_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "borrow_transactions" ADD CONSTRAINT "borrow_transactions_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "borrow_transactions" ADD CONSTRAINT "borrow_transactions_returned_by_fkey" FOREIGN KEY ("returned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "borrow_transactions" ADD CONSTRAINT "borrow_transactions_inspected_by_fkey" FOREIGN KEY ("inspected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "disposal_records" ADD CONSTRAINT "disposal_records_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disposal_records" ADD CONSTRAINT "disposal_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disposal_records" ADD CONSTRAINT "disposal_records_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disposal_records" ADD CONSTRAINT "disposal_records_disposed_by_fkey" FOREIGN KEY ("disposed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
