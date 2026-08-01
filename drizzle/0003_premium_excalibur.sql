CREATE TABLE "marshmallows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"allow_public" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"read_by" uuid,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marshmallows_content_length_check" CHECK (char_length("marshmallows"."content") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "marshmallows" ADD CONSTRAINT "marshmallows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marshmallows" ADD CONSTRAINT "marshmallows_read_by_users_id_fk" FOREIGN KEY ("read_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marshmallows" ADD CONSTRAINT "marshmallows_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marshmallows_public_feed_idx" ON "marshmallows" USING btree ("published_at") WHERE "marshmallows"."published_at" is not null and "marshmallows"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "marshmallows_pending_idx" ON "marshmallows" USING btree ("created_at") WHERE "marshmallows"."read_at" is null and "marshmallows"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "marshmallows_user_created_idx" ON "marshmallows" USING btree ("user_id","created_at");