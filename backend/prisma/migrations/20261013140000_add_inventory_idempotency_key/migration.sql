ALTER TABLE "inventory_transactions"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "inventory_transactions_idempotency_key_key"
ON "inventory_transactions"("idempotency_key");
