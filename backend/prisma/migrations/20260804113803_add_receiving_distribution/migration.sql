-- CreateEnum
CREATE TYPE "DistributionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DistributionAllocationStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "notes" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchase_order_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "received_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "id" TEXT NOT NULL,
    "accepted_quantity" INTEGER NOT NULL,
    "damaged_quantity" INTEGER NOT NULL DEFAULT 0,
    "rejected_quantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "goods_receipt_id" TEXT NOT NULL,
    "purchase_order_line_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "goods_receipt_lines_quantities_nonnegative" CHECK (
      "accepted_quantity" >= 0 AND "damaged_quantity" >= 0 AND "rejected_quantity" >= 0
    ),
    CONSTRAINT "goods_receipt_lines_quantity_present" CHECK (
      "accepted_quantity" + "damaged_quantity" + "rejected_quantity" > 0
    )
);

-- CreateTable
CREATE TABLE "distribution_plans" (
    "id" TEXT NOT NULL,
    "plan_number" TEXT NOT NULL,
    "status" "DistributionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "source_store_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_allocations" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "DistributionAllocationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMP(3),
    "distribution_plan_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "destination_store_id" TEXT NOT NULL,
    "confirmed_by" TEXT,

    CONSTRAINT "distribution_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "distribution_allocations_quantity_positive" CHECK ("quantity" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_receipt_number_key" ON "goods_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id");

-- CreateIndex
CREATE INDEX "goods_receipts_store_id_idx" ON "goods_receipts"("store_id");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_purchase_order_line_id_idx" ON "goods_receipt_lines"("purchase_order_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_lines_goods_receipt_id_purchase_order_line_id_key" ON "goods_receipt_lines"("goods_receipt_id", "purchase_order_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_plans_plan_number_key" ON "distribution_plans"("plan_number");

-- CreateIndex
CREATE INDEX "distribution_plans_source_store_id_idx" ON "distribution_plans"("source_store_id");

-- CreateIndex
CREATE INDEX "distribution_allocations_destination_store_id_idx" ON "distribution_allocations"("destination_store_id");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_allocations_distribution_plan_id_item_id_desti_key" ON "distribution_allocations"("distribution_plan_id", "item_id", "destination_store_id");

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_source_store_id_fkey" FOREIGN KEY ("source_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_allocations" ADD CONSTRAINT "distribution_allocations_distribution_plan_id_fkey" FOREIGN KEY ("distribution_plan_id") REFERENCES "distribution_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_allocations" ADD CONSTRAINT "distribution_allocations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_allocations" ADD CONSTRAINT "distribution_allocations_destination_store_id_fkey" FOREIGN KEY ("destination_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_allocations" ADD CONSTRAINT "distribution_allocations_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
