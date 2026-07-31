CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"submission_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"host_user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "host_replies_content_length_check" CHECK (char_length("host_replies"."content") between 1 and 4000)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"submission_id" uuid,
	"reply_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in ('host_reply','host_reply_updated','submission_pinned'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"site_name" text DEFAULT '主播的作品放映室' NOT NULL,
	"site_tagline" text DEFAULT '把你喜欢的作品，轻轻放进我的收件箱' NOT NULL,
	"background_type" text DEFAULT 'built_in' NOT NULL,
	"background_image_url" text,
	"primary_color" text DEFAULT '#7259d9' NOT NULL,
	"secondary_color" text DEFAULT '#ff9f76' NOT NULL,
	"accent_color" text DEFAULT '#f4c95d' NOT NULL,
	"background_color" text DEFAULT '#fff9f2' NOT NULL,
	"card_opacity" numeric(3, 2) DEFAULT '0.94' NOT NULL,
	"background_overlay" numeric(3, 2) DEFAULT '0.30' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_background_type_check" CHECK ("site_settings"."background_type" in ('built_in','custom')),
	CONSTRAINT "site_settings_card_opacity_check" CHECK ("site_settings"."card_opacity" between 0.70 and 1.00),
	CONSTRAINT "site_settings_overlay_check" CHECK ("site_settings"."background_overlay" between 0.00 and 0.85)
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"normalized_title" text NOT NULL,
	"description" text,
	"external_url" text,
	"anonymous_public" boolean DEFAULT false NOT NULL,
	"host_read_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"feed_activity_at" timestamp with time zone,
	"content_status" text DEFAULT 'pending' NOT NULL,
	"content_completed_at" timestamp with time zone,
	"pinned_at" timestamp with time zone,
	"pinned_by" uuid,
	"pin_note" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_category_check" CHECK ("submissions"."category" in ('book','manga','movie','anime','game','other')),
	CONSTRAINT "submissions_status_check" CHECK ("submissions"."content_status" in ('pending','in_progress','completed','dropped')),
	CONSTRAINT "submissions_title_length_check" CHECK (char_length("submissions"."title") between 1 and 100),
	CONSTRAINT "submissions_description_length_check" CHECK ("submissions"."description" is null or char_length("submissions"."description") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"username_normalized" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('user', 'host')),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'banned'))
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_replies" ADD CONSTRAINT "host_replies_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_replies" ADD CONSTRAINT "host_replies_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reply_id_host_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."host_replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_pinned_by_users_id_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_actor_created_idx" ON "activity_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "host_replies_submission_uidx" ON "host_replies" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","created_at") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uidx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_expiry_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "submissions_public_feed_idx" ON "submissions" USING btree ("pinned_at","feed_activity_at") WHERE "submissions"."published_at" is not null and "submissions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "submissions_user_idx" ON "submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "submissions_inbox_idx" ON "submissions" USING btree ("host_read_at","created_at") WHERE "submissions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "submissions_library_idx" ON "submissions" USING btree ("content_status","category","feed_activity_at") WHERE "submissions"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_normalized_uidx" ON "users" USING btree ("username_normalized");