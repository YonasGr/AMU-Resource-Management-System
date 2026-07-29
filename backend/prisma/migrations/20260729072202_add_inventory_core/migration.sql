-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE_RECEIVE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ISSUE', 'RETURN', 'DISPOSAL', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "store_inventory" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minimum_stock" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "store_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "reference_id" TEXT,
    "item_id" TEXT NOT NULL,
    "from_store_id" TEXT,
    "to_store_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_inventory_store_id_idx" ON "store_inventory"("store_id");

-- CreateIndex
CREATE INDEX "store_inventory_item_id_idx" ON "store_inventory"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_inventory_store_id_item_id_key" ON "store_inventory"("store_id", "item_id");

-- CreateIndex
CREATE INDEX "inventory_movements_item_id_idx" ON "inventory_movements"("item_id");

-- CreateIndex
CREATE INDEX "inventory_movements_from_store_id_idx" ON "inventory_movements"("from_store_id");

-- CreateIndex
CREATE INDEX "inventory_movements_to_store_id_idx" ON "inventory_movements"("to_store_id");

-- AddForeignKey
ALTER TABLE "store_inventory" ADD CONSTRAINT "store_inventory_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_inventory" ADD CONSTRAINT "store_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_from_store_id_fkey" FOREIGN KEY ("from_store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_to_store_id_fkey" FOREIGN KEY ("to_store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
