import "dotenv/config";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../db/index";
import { hostReplies, siteSettings, submissions, users } from "../db/schema";

try{
  const passwordHash=await hash("demo-password-change-me",12);
  const [existing]=await getDb().select().from(users).where(eq(users.usernameNormalized,"演示观众")).limit(1);
  const user=existing??(await getDb().insert(users).values({username:"演示观众",usernameNormalized:"演示观众",passwordHash,status:"active",bilibiliUid:"100000",bilibiliVerifiedAt:new Date()}).returning())[0];
  const [submission]=await getDb().insert(submissions).values({userId:user.id,category:"book",title:"银河边缘的温柔故事",normalizedTitle:"银河边缘的温柔故事",description:"节奏舒缓，但每一章都藏着一点让人微笑的东西。",hostReadAt:new Date(),publishedAt:new Date(),feedActivityAt:new Date(),contentStatus:"completed"}).returning();
  const [host]=await getDb().select().from(users).where(eq(users.role,"host")).limit(1);
  if(host)await getDb().insert(hostReplies).values({submissionId:submission.id,hostUserId:host.id,content:"读完像从很远的地方收到一封信，安静又明亮。"});
  await getDb().insert(siteSettings).values({id:"default"}).onConflictDoNothing();
  console.log("示例数据已写入。演示账号只用于本地展示，请勿在生产环境保留默认密码。");
}finally{await closeDb();}
