import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../db/index";
import { users } from "../db/schema";
import { normalizeUsername } from "../lib/security";
import { authSchema } from "../lib/validation";

const rl=createInterface({input:stdin,output:stdout});
try{
  const username=await rl.question("主播用户名：");
  const password=await rl.question("主播密码（输入会显示，请确认周围无人）：");
  const confirm=await rl.question("再次输入密码：");
  if(password!==confirm)throw new Error("两次输入的密码不一致");
  const parsed=authSchema.parse({username,password}); const normalized=normalizeUsername(parsed.username);
  const [existing]=await getDb().select().from(users).where(eq(users.usernameNormalized,normalized)).limit(1);
  const passwordHash=await hash(parsed.password,12);
  if(existing){await getDb().update(users).set({role:"host",status:"active",passwordHash,updatedAt:new Date()}).where(eq(users.id,existing.id));console.log(`已将 ${existing.username} 更新为主播账号。`);}
  else{await getDb().insert(users).values({username:parsed.username,usernameNormalized:normalized,passwordHash,role:"host"});console.log(`已创建主播账号 ${parsed.username}。`);}
}catch(error){console.error(error instanceof Error?error.message:"创建失败");process.exitCode=1;}finally{rl.close();await closeDb();}
