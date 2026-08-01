UPDATE "users"
SET "bilibili_uid" = NULL,
    "bilibili_verification_code" = NULL,
    "bilibili_verified_at" = NULL,
    "updated_at" = NOW()
WHERE "bilibili_uid" = '1428849513'
  AND "id" <> (SELECT "id" FROM "users" WHERE "role" = 'host' ORDER BY "created_at" LIMIT 1);--> statement-breakpoint

UPDATE "users"
SET "bilibili_uid" = '1428849513',
    "bilibili_verification_code" = NULL,
    "bilibili_verified_at" = COALESCE("bilibili_verified_at", NOW()),
    "updated_at" = NOW()
WHERE "id" = (SELECT "id" FROM "users" WHERE "role" = 'host' ORDER BY "created_at" LIMIT 1);
