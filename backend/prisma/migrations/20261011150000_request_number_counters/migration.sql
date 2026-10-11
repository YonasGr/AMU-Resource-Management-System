CREATE TABLE "request_number_counters" (
    "year" INTEGER NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_number_counters_pkey" PRIMARY KEY ("year")
);

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
ON CONFLICT ("year") DO NOTHING;
