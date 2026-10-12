CREATE TYPE "MaterialReturnStatus" AS ENUM ('DRAFT', 'INSPECTED', 'POSTED', 'CANCELLED');
CREATE TYPE "ReturnDisposition" AS ENUM ('ACCEPT_TO_STOCK', 'QUARANTINE', 'SCRAP');

CREATE TABLE "material_returns" (
    "id" TEXT NOT NULL,
    "return_code" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "request_item_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "condition" TEXT,
    "disposition" "ReturnDisposition",
    "status" "MaterialReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "inspected_by_id" TEXT,
    "inspected_at" TIMESTAMP(3),
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "material_returns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "material_returns_return_code_key" ON "material_returns"("return_code");
CREATE INDEX "material_returns_store_id_status_idx" ON "material_returns"("store_id", "status");
CREATE INDEX "material_returns_request_id_request_item_id_idx" ON "material_returns"("request_id", "request_item_id");
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "material_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "material_request_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_inspected_by_id_fkey" FOREIGN KEY ("inspected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
