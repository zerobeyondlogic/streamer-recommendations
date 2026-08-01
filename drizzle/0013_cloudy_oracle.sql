ALTER TABLE "site_settings" ADD COLUMN "nav_opacity" numeric(3, 2) DEFAULT '0.94' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "hero_opacity" numeric(3, 2) DEFAULT '0.94' NOT NULL;--> statement-breakpoint
UPDATE "site_settings" SET "nav_opacity" = "card_opacity", "hero_opacity" = "card_opacity";--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_nav_opacity_check" CHECK ("site_settings"."nav_opacity" between 0.70 and 1.00);--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_hero_opacity_check" CHECK ("site_settings"."hero_opacity" between 0.70 and 1.00);
