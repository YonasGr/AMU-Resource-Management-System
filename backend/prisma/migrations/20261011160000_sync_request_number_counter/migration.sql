UPDATE "material_requests"
SET "request_number" =
    'REQ-' ||
    SUBSTRING("request_number" FROM '^REQ-([0-9]{4})-[0-9]+$') ||
    '-' ||
    LPAD(SUBSTRING("request_number" FROM '^REQ-[0-9]{4}-([0-9]+)$'), 4, '0')
WHERE "request_number" ~ '^REQ-[0-9]{4}-[0-9]+$'
  AND "request_number" !~ '^REQ-[0-9]{4}-[0-9]{4}$';

INSERT INTO "request_number_counters" ("year", "next_number")
SELECT parsed."year", MAX(parsed."sequence") + 1
FROM (
    SELECT
        CAST(SUBSTRING("request_number" FROM '^REQ-([0-9]{4})-[0-9]+$') AS INTEGER) AS "year",
        CAST(SUBSTRING("request_number" FROM '^REQ-[0-9]{4}-([0-9]+)$') AS INTEGER) AS "sequence"
    FROM "material_requests"
    WHERE "request_number" ~ '^REQ-[0-9]{4}-[0-9]+$'
) AS parsed
GROUP BY parsed."year"
ON CONFLICT ("year") DO UPDATE
SET "next_number" = GREATEST(
    "request_number_counters"."next_number",
    EXCLUDED."next_number"
),
"updated_at" = CURRENT_TIMESTAMP;
