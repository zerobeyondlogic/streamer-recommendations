ALTER TABLE "users" DROP CONSTRAINT "users_status_check";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bilibili_rejection_message" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bilibili_rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_bilibili_rejection_message_check" CHECK ("users"."bilibili_rejection_message" is null or char_length("users"."bilibili_rejection_message") between 1 and 500);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" in ('pending', 'rejected', 'active', 'banned', 'deleted'));