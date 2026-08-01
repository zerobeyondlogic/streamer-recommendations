ALTER TABLE "site_settings" ALTER COLUMN "site_name" SET DEFAULT '神绮爱的宝箱';
--> statement-breakpoint
UPDATE "site_settings"
SET "site_name" = '神绮爱的宝箱', "updated_at" = now()
WHERE "id" = 'default' AND "site_name" = '神绮爱的作品放映室';
