import { sql } from "drizzle-orm";

/** Keep outer columns qualified when they are referenced by a nested select. */
export function qualifiedColumn(tableName: string, columnName: string) {
  return sql`${sql.identifier(tableName)}.${sql.identifier(columnName)}`;
}
