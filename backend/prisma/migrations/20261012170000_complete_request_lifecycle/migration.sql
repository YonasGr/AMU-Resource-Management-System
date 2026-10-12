ALTER TYPE "RequestStatus" ADD VALUE 'BACKORDERED';
ALTER TYPE "RequestStatus" ADD VALUE 'CLOSED';
ALTER TABLE "material_requests"
  ADD COLUMN "cancelled_by_id" TEXT,
  ADD COLUMN "cancelled_at" TIMESTAMP(3),
  ADD COLUMN "cancellation_reason" TEXT,
  ADD COLUMN "handover_evidence" TEXT,
  ADD COLUMN "handed_over_by_id" TEXT,
  ADD COLUMN "handed_over_at" TIMESTAMP(3),
  ADD COLUMN "confirmed_by_id" TEXT,
  ADD COLUMN "confirmed_at" TIMESTAMP(3),
  ADD COLUMN "closed_at" TIMESTAMP(3);
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_handed_over_by_id_fkey" FOREIGN KEY ("handed_over_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
