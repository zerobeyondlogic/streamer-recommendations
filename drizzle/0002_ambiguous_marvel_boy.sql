ALTER TABLE "site_settings" ALTER COLUMN "site_name" SET DEFAULT '神绮爱的作品放映室';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "site_tagline" SET DEFAULT '书籍、漫画、电影、动漫和游戏都可以投稿。';--> statement-breakpoint
UPDATE "site_settings" SET "site_name" = '神绮爱的作品放映室' WHERE "site_name" = '主播的作品放映室';--> statement-breakpoint
UPDATE "site_settings" SET "site_tagline" = '书籍、漫画、电影、动漫和游戏都可以投稿。' WHERE "site_tagline" = '把你喜欢的作品，轻轻放进我的收件箱';
