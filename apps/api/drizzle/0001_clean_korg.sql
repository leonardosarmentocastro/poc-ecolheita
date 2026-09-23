CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
TRUNCATE TABLE "products";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "embedding" vector(384) NOT NULL;
