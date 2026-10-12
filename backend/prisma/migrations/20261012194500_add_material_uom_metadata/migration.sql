CREATE TYPE "UnitCategory" AS ENUM ('COUNT', 'MASS', 'VOLUME', 'LENGTH', 'AREA', 'PACKAGE', 'OTHER');

ALTER TABLE "materials"
  ADD COLUMN "unit_category" "UnitCategory" NOT NULL DEFAULT 'COUNT',
  ADD COLUMN "base_unit" TEXT NOT NULL DEFAULT 'piece',
  ADD COLUMN "conversion_factor_to_base" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "allows_fractional" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "materials"
  ADD CONSTRAINT "materials_conversion_factor_to_base_check"
  CHECK ("conversion_factor_to_base" > 0);
