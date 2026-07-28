-- CreateEnum
CREATE TYPE "OrganizationUnitType" AS ENUM ('UNIVERSITY', 'COLLEGE', 'DEPARTMENT', 'OFFICE', 'BUREAU', 'DIRECTORATE', 'UNIT');

-- CreateEnum
CREATE TYPE "OrganizationUnitStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "organization_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationUnitType" NOT NULL,
    "status" "OrganizationUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_units_parent_id_idx" ON "organization_units"("parent_id");

-- AddForeignKey
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
