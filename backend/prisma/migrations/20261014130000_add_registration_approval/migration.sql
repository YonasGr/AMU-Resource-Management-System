-- New self-registrations are authenticated but cannot submit requests until approved.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "employee_code" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_employee_code_key"
  ON "users"("employee_code");
