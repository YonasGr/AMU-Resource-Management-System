ALTER TABLE "material_request_items"
ADD COLUMN "quantity_returned" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "inventory_transactions"
ADD COLUMN "request_item_id" TEXT;

UPDATE "inventory_transactions" AS txn
SET "request_item_id" = (
  SELECT item."id"
  FROM "material_request_items" AS item
  WHERE item."request_id" = txn."request_id"
    AND item."material_id" = txn."material_id"
  ORDER BY item."id"
  LIMIT 1
)
WHERE txn."type" = 'STOCK_OUT'
  AND txn."request_id" IS NOT NULL;

ALTER TABLE "inventory_transactions"
ADD CONSTRAINT "inventory_transactions_request_item_id_fkey"
FOREIGN KEY ("request_item_id") REFERENCES "material_request_items"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "inventory_transactions_request_item_id_idx"
ON "inventory_transactions"("request_item_id");
