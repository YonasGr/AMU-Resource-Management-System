ALTER TABLE "audit_logs"
  ADD COLUMN "actor_role" TEXT,
  ADD COLUMN "entity_type" TEXT,
  ADD COLUMN "entity_id" TEXT,
  ADD COLUMN "correlation_id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'api',
  ADD COLUMN "user_agent" TEXT,
  ADD COLUMN "before_data" JSONB,
  ADD COLUMN "after_data" JSONB;

CREATE INDEX "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable';
END;
$$;

CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
