CREATE TYPE "CycleCountStatus" AS ENUM ('DRAFT', 'COUNTED', 'APPROVED', 'RECOUNT_REQUIRED', 'CANCELLED');

CREATE TABLE "cycle_counts" (
    "id" TEXT NOT NULL,
    "count_code" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "status" "CycleCountStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cycle_counts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cycle_count_lines" (
    "id" TEXT NOT NULL,
    "cycle_count_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "system_quantity" INTEGER NOT NULL,
    "physical_quantity" INTEGER,
    "variance" INTEGER NOT NULL DEFAULT 0,
    "variance_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cycle_count_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cycle_counts_count_code_key" ON "cycle_counts"("count_code");
CREATE INDEX "cycle_counts_store_id_status_idx" ON "cycle_counts"("store_id", "status");
CREATE UNIQUE INDEX "cycle_count_lines_cycle_count_id_material_id_key" ON "cycle_count_lines"("cycle_count_id", "material_id");
CREATE INDEX "cycle_count_lines_material_id_idx" ON "cycle_count_lines"("material_id");
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_cycle_count_id_fkey" FOREIGN KEY ("cycle_count_id") REFERENCES "cycle_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
