CREATE TABLE "site_copy_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"recommendation_hero_title" text DEFAULT '把喜欢的作品，' NOT NULL,
	"recommendation_hero_accent" text DEFAULT '推荐给神绮爱。' NOT NULL,
	"recommendation_section_title" text DEFAULT '最近的作品推荐' NOT NULL,
	"food_hero_title" text DEFAULT '好吃的，当然要一起分享。' NOT NULL,
	"food_tagline" text DEFAULT '推荐值得一吃的店铺、菜品和味道。' NOT NULL,
	"food_section_title" text DEFAULT '大家的美食推荐' NOT NULL,
	"wish_hero_title" text DEFAULT '下一次直播，想和神绮爱做什么？' NOT NULL,
	"wish_tagline" text DEFAULT '许愿台词回读、一起看作品，或任何直播企划。' NOT NULL,
	"wish_section_title" text DEFAULT '等待实现的愿望' NOT NULL,
	"marshmallow_hero_title" text DEFAULT '给神绮爱一颗棉花糖' NOT NULL,
	"marshmallow_tagline" text DEFAULT '写下想说的话，默认仅神绮爱可见。' NOT NULL,
	"marshmallow_section_title" text DEFAULT '已上墙的棉花糖' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_copy_settings" ADD CONSTRAINT "site_copy_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
