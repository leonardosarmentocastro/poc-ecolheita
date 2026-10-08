CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
-- Backfill only. Mirrors normalizeForSearch (trim, lowercase, collapse whitespace, NFD, drop
-- combining marks); a test proves the two agree. The application never calls it.
CREATE OR REPLACE FUNCTION ecolheita_search_name(name text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT regexp_replace(
    normalize(
      regexp_replace(lower(regexp_replace(replace(name, chr(160), ' '), '^\s+|\s+$', '', 'g')), '\s+', ' ', 'g'),
      NFD
    ),
    '[\u0300-\u036f]', '', 'g'
  )
$$;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "search_name" text;--> statement-breakpoint
UPDATE "products" SET "search_name" = ecolheita_search_name("name");--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "search_name" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "products_search_name_trgm_idx" ON "products" USING gist ("search_name" gist_trgm_ops);
