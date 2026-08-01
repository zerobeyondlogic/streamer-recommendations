import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin,stdout } from "node:process";
import { count } from "drizzle-orm";
import { closeDb,getDb } from "../db/index";
import { activityLogs,hostReplies,marshmallows,notifications,siteSettings,submissions,users } from "../db/schema";
import { validateBackup } from "../lib/export";

const args=process.argv.slice(2);const path=args.find(x=>!x.startsWith("--"));const dryRun=args.includes("--dry-run");if(!path)throw new Error("用法：npm run backup:restore -- path/to/backup.zip [--dry-run]");
const data=await validateBackup(await readFile(resolve(path)));const counts={users:data.users.length,submissions:data.submissions.length,marshmallows:data.marshmallows.length,replies:data.replies.length,notifications:data.notifications.length,settings:data.settings.length,logs:data.logs.length};console.log("即将导入：",counts);
const [target]=await getDb().select({value:count()}).from(users);console.log(`目标数据库当前有 ${target.value} 个用户。`);
if(dryRun){console.log("dry-run 完成：文件、校验值、schema 版本和目标数据库连接均有效；未写入数据。");await closeDb();process.exit(0);}
const rl=createInterface({input:stdin,output:stdout});const answer=await rl.question("输入 RESTORE 确认导入（不会恢复 Session）：");rl.close();if(answer!=="RESTORE"){console.log("已取消。");await closeDb();process.exit(0);}
const dates=(row:Record<string,unknown>)=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==="string"&&/(At|_at)$/.test(key)&&value?new Date(value):value]));
try{await getDb().transaction(async tx=>{if(data.users.length)await tx.insert(users).values(data.users.map(dates) as (typeof users.$inferInsert)[]).onConflictDoNothing();if(data.submissions.length)await tx.insert(submissions).values(data.submissions.map(dates) as (typeof submissions.$inferInsert)[]).onConflictDoNothing();if(data.marshmallows.length)await tx.insert(marshmallows).values(data.marshmallows.map(dates) as (typeof marshmallows.$inferInsert)[]).onConflictDoNothing();if(data.replies.length)await tx.insert(hostReplies).values(data.replies.map(dates) as (typeof hostReplies.$inferInsert)[]).onConflictDoNothing();if(data.notifications.length)await tx.insert(notifications).values(data.notifications.map(dates) as (typeof notifications.$inferInsert)[]).onConflictDoNothing();if(data.settings.length)await tx.insert(siteSettings).values(data.settings.map(dates) as (typeof siteSettings.$inferInsert)[]).onConflictDoNothing();if(data.logs.length)await tx.insert(activityLogs).values(data.logs.map(dates) as (typeof activityLogs.$inferInsert)[]).onConflictDoNothing();});console.log("恢复完成。索引由 Drizzle migration 维护；旧 Session 未恢复。活动数据已按外键顺序导入。");}finally{await closeDb();}
