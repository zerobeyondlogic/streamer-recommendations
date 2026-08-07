ALTER TABLE "site_copy_settings" ADD COLUMN "musings_hero_title" text DEFAULT '碎碎念' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_copy_settings" ADD COLUMN "musings_tagline" text DEFAULT '一些近况、随想，和想说的话。' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_copy_settings" ADD COLUMN "musings_section_title" text DEFAULT '最近在想' NOT NULL;