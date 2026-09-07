ALTER TABLE "notifications" DROP CONSTRAINT "notifications_type_check";--> statement-breakpoint
ALTER TABLE "marshmallows" ADD COLUMN "reply_content" text;--> statement-breakpoint
ALTER TABLE "marshmallows" ADD COLUMN "replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "marshmallows" ADD COLUMN "reply_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "marshmallows" ADD COLUMN "replied_by" uuid;--> statement-breakpoint
ALTER TABLE "marshmallows" ADD COLUMN "unpublished_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "marshmallow_id" uuid;--> statement-breakpoint
ALTER TABLE "marshmallows" ADD CONSTRAINT "marshmallows_replied_by_users_id_fk" FOREIGN KEY ("replied_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_marshmallow_id_marshmallows_id_fk" FOREIGN KEY ("marshmallow_id") REFERENCES "public"."marshmallows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marshmallows" ADD CONSTRAINT "marshmallows_reply_length_check" CHECK ("marshmallows"."reply_content" is null or char_length("marshmallows"."reply_content") between 1 and 2000);--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in ('host_reply','host_reply_updated','submission_pinned','review_reply','marshmallow_reply'));