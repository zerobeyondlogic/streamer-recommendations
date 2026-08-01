ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_nav_opacity_check";--> statement-breakpoint
ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_hero_opacity_check";--> statement-breakpoint
ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_card_opacity_check";--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_nav_opacity_check" CHECK ("site_settings"."nav_opacity" between 0.30 and 1.00);--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_hero_opacity_check" CHECK ("site_settings"."hero_opacity" between 0.30 and 1.00);--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_card_opacity_check" CHECK ("site_settings"."card_opacity" between 0.30 and 1.00);