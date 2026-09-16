CREATE TABLE "radio_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"kind" text DEFAULT 'story' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "radio_entries_title_check" CHECK (char_length(btrim("radio_entries"."title")) between 1 and 160),
	CONSTRAINT "radio_entries_content_check" CHECK (char_length("radio_entries"."content") <= 50000 and char_length(btrim("radio_entries"."content")) >= 1),
	CONSTRAINT "radio_entries_kind_check" CHECK ("radio_entries"."kind" in ('story', 'submission')),
	CONSTRAINT "radio_entries_position_check" CHECK ("radio_entries"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "radio_episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"episode_number" integer NOT NULL,
	"title" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "radio_episodes_number_check" CHECK ("radio_episodes"."episode_number" >= 1),
	CONSTRAINT "radio_episodes_title_check" CHECK (char_length(btrim("radio_episodes"."title")) between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "radio_entries" ADD CONSTRAINT "radio_entries_episode_id_radio_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."radio_episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radio_episodes" ADD CONSTRAINT "radio_episodes_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "radio_entries_episode_position_idx" ON "radio_entries" USING btree ("episode_id","position","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "radio_episodes_number_uidx" ON "radio_episodes" USING btree ("episode_number");--> statement-breakpoint
CREATE INDEX "radio_episodes_host_idx" ON "radio_episodes" USING btree ("host_user_id","episode_number");