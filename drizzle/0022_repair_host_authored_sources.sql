UPDATE "submissions"
SET
	"source" = 'host',
	"anonymous_public" = false,
	"updated_at" = now()
WHERE
	"source" = 'user'
	AND "user_id" IN (
		SELECT "id"
		FROM "users"
		WHERE "role" = 'host'
	);
