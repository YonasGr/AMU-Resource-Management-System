CREATE INDEX "stock_balances_store_id_material_id_idx" ON "stock_balances"("store_id", "material_id");
CREATE INDEX "inventory_transactions_store_id_created_at_idx" ON "inventory_transactions"("store_id", "created_at");
CREATE INDEX "inventory_transactions_type_created_at_idx" ON "inventory_transactions"("type", "created_at");
