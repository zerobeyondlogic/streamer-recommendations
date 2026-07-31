ALTER TABLE "users" DROP CONSTRAINT "users_status_check";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "source" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bilibili_uid" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bilibili_verification_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bilibili_verified_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "submissions_score_idx" ON "submissions" USING btree ("pinned_at","score","feed_activity_at") WHERE "submissions"."published_at" is not null and "submissions"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_bilibili_uid_uidx" ON "users" USING btree ("bilibili_uid") WHERE "users"."bilibili_uid" is not null;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_source_check" CHECK ("submissions"."source" in ('user','host'));--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_score_check" CHECK ("submissions"."score" is null or ("submissions"."score" between 1 and 10 and "submissions"."content_status" = 'completed'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_bilibili_uid_check" CHECK ("users"."bilibili_uid" is null or "users"."bilibili_uid" ~ '^[1-9][0-9]{0,19}$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" in ('pending', 'active', 'banned'));