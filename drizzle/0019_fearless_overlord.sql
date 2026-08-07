CREATE TABLE "host_musings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"pinned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "host_musings_content_length_check" CHECK (char_length("host_musings"."content") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "host_musings" ADD CONSTRAINT "host_musings_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "host_musings_public_feed_idx" ON "host_musings" USING btree ("pinned_at","created_at");