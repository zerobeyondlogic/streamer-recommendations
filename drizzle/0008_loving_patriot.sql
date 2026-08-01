ALTER TABLE "users" DROP CONSTRAINT "users_status_check";--> statement-breakpoint
ALTER TABLE "site_copy_settings" ADD COLUMN "recommendation_tagline" text DEFAULT '书籍、漫画、电影、动漫和游戏都可以投稿。' NOT NULL;--> statement-breakpoint
UPDATE "site_copy_settings" SET "recommendation_tagline" = COALESCE((SELECT "site_tagline" FROM "site_settings" LIMIT 1), "recommendation_tagline");--> statement-breakpoint
UPDATE "site_settings" SET "background_image_url" = 'builtin:warm' WHERE "background_type" = 'built_in' AND "background_image_url" IN ('builtin:stars', 'builtin:bubbles');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" in ('pending', 'active', 'banned', 'deleted'));
