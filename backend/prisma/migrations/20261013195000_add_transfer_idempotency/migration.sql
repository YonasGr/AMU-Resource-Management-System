ALTER TABLE "inventory_transfers"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "inventory_transfers_idempotency_key_key"
ON "inventory_transfers"("idempotency_key");
