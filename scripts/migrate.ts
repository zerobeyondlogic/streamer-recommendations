import "dotenv/config";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { closeDb, getDb } from "../db/index";

try { await migrate(getDb(), { migrationsFolder: "drizzle" }); console.log("数据库迁移完成。"); }
finally { await closeDb(); }
