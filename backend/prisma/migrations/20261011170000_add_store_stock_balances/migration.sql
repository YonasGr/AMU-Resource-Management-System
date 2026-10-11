CREATE TABLE "stock_balances" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantity_received" INTEGER NOT NULL DEFAULT 0,
    "quantity_issued" INTEGER NOT NULL DEFAULT 0,
    "remaining_quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_balances_store_id_material_id_key"
ON "stock_balances"("store_id", "material_id");

CREATE INDEX "stock_balances_material_id_idx"
ON "stock_balances"("material_id");

ALTER TABLE "inventory_transactions"
ADD COLUMN "store_id" TEXT;

ALTER TABLE "stock_balances"
ADD CONSTRAINT "stock_balances_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "stores"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_balances"
ADD CONSTRAINT "stock_balances_material_id_fkey"
FOREIGN KEY ("material_id") REFERENCES "materials"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_transactions"
ADD CONSTRAINT "inventory_transactions_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "stores"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

WITH default_store AS (
    SELECT "id"
    FROM "stores"
    WHERE "status" = 'ACTIVE'
    ORDER BY "created_at", "id"
    LIMIT 1
)
INSERT INTO "stock_balances" (
    "id",
    "store_id",
    "material_id",
    "quantity_received",
    "quantity_issued",
    "remaining_quantity",
    "updated_at"
)
SELECT
    md5(random()::text || clock_timestamp()::text),
    default_store."id",
    summary."material_id",
    summary."quantity_received",
    summary."quantity_issued",
    summary."remaining_quantity",
    CURRENT_TIMESTAMP
FROM "stock_summaries" AS summary
CROSS JOIN default_store
ON CONFLICT ("store_id", "material_id") DO NOTHING;

UPDATE "inventory_transactions" AS txn
SET "store_id" = COALESCE(
    (SELECT request."store_id" FROM "material_requests" AS request WHERE request."id" = txn."request_id"),
    (SELECT usr."store_id" FROM "users" AS usr WHERE usr."id" = txn."issued_by_id"),
    (SELECT "id" FROM "stores" WHERE "status" = 'ACTIVE' ORDER BY "created_at", "id" LIMIT 1)
)
WHERE txn."store_id" IS NULL;
