import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

let database: NeonDatabase<typeof schema> | undefined;
let pool: Pool | undefined;

export function getDb() {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL_MISSING");
  pool = new Pool({ connectionString });
  database = drizzle({ client: pool, schema });
  return database;
}

export async function closeDb() {
  await pool?.end();
  database = undefined;
  pool = undefined;
}
