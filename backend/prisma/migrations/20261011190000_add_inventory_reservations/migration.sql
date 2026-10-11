ALTER TABLE "stock_balances"
ADD COLUMN "reserved_quantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "material_request_items"
ADD COLUMN "quantity_reserved" INTEGER NOT NULL DEFAULT 0;
