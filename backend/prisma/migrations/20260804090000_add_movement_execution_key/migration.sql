-- Workflow execution may be retried after a transient failure. This unique
-- key makes each logical inventory effect apply at most once.
ALTER TABLE "inventory_movements" ADD COLUMN "execution_key" TEXT;

CREATE UNIQUE INDEX "inventory_movements_execution_key_key"
ON "inventory_movements"("execution_key");
