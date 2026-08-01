ALTER TABLE "site_settings" ADD COLUMN "filter_opacity" numeric(3, 2) DEFAULT '0.72' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "nav_blur" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "hero_blur" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "filter_blur" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "card_blur" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_filter_opacity_check" CHECK ("site_settings"."filter_opacity" between 0.30 and 1.00);