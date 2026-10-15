ALTER TABLE "books" ADD COLUMN "is_extra" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Until now an extra was recorded as a fractional volume (4.5): flag those. The number is kept as the sort position.
UPDATE "books" SET "is_extra" = true WHERE "volume_number" <> trunc("volume_number");
