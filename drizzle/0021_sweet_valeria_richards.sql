CREATE TABLE "host_musing_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_musing_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marshmallow_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marshmallow_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_reviews" ALTER COLUMN "recommend" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "host_musing_likes" ADD CONSTRAINT "host_musing_likes_host_musing_id_host_musings_id_fk" FOREIGN KEY ("host_musing_id") REFERENCES "public"."host_musings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_musing_likes" ADD CONSTRAINT "host_musing_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marshmallow_likes" ADD CONSTRAINT "marshmallow_likes_marshmallow_id_marshmallows_id_fk" FOREIGN KEY ("marshmallow_id") REFERENCES "public"."marshmallows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marshmallow_likes" ADD CONSTRAINT "marshmallow_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "host_musing_likes_musing_user_uidx" ON "host_musing_likes" USING btree ("host_musing_id","user_id");--> statement-breakpoint
CREATE INDEX "host_musing_likes_musing_created_idx" ON "host_musing_likes" USING btree ("host_musing_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "marshmallow_likes_marshmallow_user_uidx" ON "marshmallow_likes" USING btree ("marshmallow_id","user_id");--> statement-breakpoint
CREATE INDEX "marshmallow_likes_marshmallow_created_idx" ON "marshmallow_likes" USING btree ("marshmallow_id","created_at");--> statement-breakpoint
ALTER TABLE "submission_reviews" ADD CONSTRAINT "submission_reviews_content_check" CHECK ("submission_reviews"."recommend" is not null or "submission_reviews"."comment" is not null);