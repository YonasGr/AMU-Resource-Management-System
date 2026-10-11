CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'RECEIVED', 'CANCELLED');

CREATE TABLE "inventory_transfers" (
    "id" TEXT NOT NULL,
    "transfer_code" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "source_store_id" TEXT NOT NULL,
    "destination_store_id" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "purpose" TEXT,
    "remarks" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "dispatched_by_id" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "received_by_id" TEXT,
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inventory_transfers_transfer_code_key" ON "inventory_transfers"("transfer_code");
CREATE INDEX "inventory_transfers_source_store_id_status_idx" ON "inventory_transfers"("source_store_id", "status");
CREATE INDEX "inventory_transfers_destination_store_id_status_idx" ON "inventory_transfers"("destination_store_id", "status");
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_source_store_id_fkey" FOREIGN KEY ("source_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_destination_store_id_fkey" FOREIGN KEY ("destination_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_dispatched_by_id_fkey" FOREIGN KEY ("dispatched_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
