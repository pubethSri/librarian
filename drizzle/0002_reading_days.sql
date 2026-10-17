-- Reading dates become calendar days, stored like purchase dates: UTC midnight (STATUS.md → Reading-flow Decisions 2026-10-16).
-- Reads stamped with a real instant before this change move to their Bangkok calendar day. Rows already at UTC midnight are untouched, so it can run twice.
UPDATE "reading" SET "started_at" = date_trunc('day', "started_at" AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'UTC'
WHERE "started_at" IS NOT NULL AND "started_at" <> date_trunc('day', "started_at" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';--> statement-breakpoint
UPDATE "reading" SET "finished_at" = date_trunc('day', "finished_at" AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'UTC'
WHERE "finished_at" IS NOT NULL AND "finished_at" <> date_trunc('day', "finished_at" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
