import { getDb } from "@/db";
import { activityLogs, hostReplies, marshmallows, notifications, siteCopySettings, siteSettings, submissionReviews, submissions, users } from "@/db/schema";
import { isAllowedBackgroundUrl, isAllowedSiteFontUrl, safeSpreadsheetCell, sha256 } from "./security";
import type { Cell, Sheet, SheetData } from "write-excel-file/node";

export const SCHEMA_VERSION = "10";
const isoDate = () => new Date().toISOString().slice(0, 10);
const json = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2));

export async function createXlsxExport() {
  const writeExcelFile = (await import("write-excel-file/node")).default;
  const db = getDb();
  const [submissionRows, userRows, notificationRows, settingsRows, copyRows, marshmallowRows, reviewRows] = await Promise.all([
    db.select().from(submissions), db.select().from(users), db.select().from(notifications), db.select().from(siteSettings), db.select().from(siteCopySettings), db.select().from(marshmallows), db.select().from(submissionReviews),
  ]);
  const replies = await db.select().from(hostReplies);
  const usernames = new Map(userRows.map((row) => [row.id, row.username]));
  const replyMap = new Map(replies.map((row) => [row.submissionId, row]));
  const sheets: Sheet<Buffer>[]=[];
  const excelCell=(input:unknown):Cell=>{const value=safeSpreadsheetCell(input);if(value===null||value===undefined)return null;if(value instanceof Date||typeof value==="string"||typeof value==="number"||typeof value==="boolean")return value;return String(value);};
  const add = (name: string, columns: string[], rows: unknown[][]) => {
    const header=columns.map((value)=>({value,fontWeight:"bold" as const,textColor:"#ffffff",backgroundColor:"#7259d9",wrap:true}));
    const data:SheetData=[header,...rows.map(row=>row.map(excelCell))];
    sheets.push({sheet:name,data,stickyRowsCount:1,showGridLines:true,columns:columns.map(()=>({width:22}))});
  };
  add("投稿", ["投稿 ID","来源","分类","作品名称","推荐介绍","相关链接","投稿用户名","是否匿名展示","投稿时间","神绮爱查看时间","首次公开时间","首页最后活跃时间","作品状态","作品完成时间","神绮爱评分","是否置顶","置顶时间","置顶推荐语","神绮爱感想","感想发布时间","是否删除","删除时间"], submissionRows.map((s) => { const r=replyMap.get(s.id); return [s.id,s.source,s.category,s.title,s.description,s.externalUrl,usernames.get(s.userId),s.anonymousPublic,s.createdAt,s.hostReadAt,s.publishedAt,s.feedActivityAt,s.contentStatus,s.contentCompletedAt,s.score,!!s.pinnedAt,s.pinnedAt,s.pinNote,r?.content,r?.publishedAt,!!s.deletedAt,s.deletedAt]; }));
  const submissionCounts = new Map<string, number>(); submissionRows.forEach((s) => submissionCounts.set(s.userId, (submissionCounts.get(s.userId)??0)+1));
  add("用户", ["用户 ID","用户名","B站 UID","UID 已核验","角色","状态","注册时间","删除时间","投稿数量"], userRows.map((u) => [u.id,u.username,u.bilibiliUid,!!u.bilibiliVerifiedAt,u.role,u.status,u.createdAt,u.deletedAt,submissionCounts.get(u.id)??0]));
  add("通知", ["通知 ID","接收用户 ID","类型","投稿 ID","是否已读","创建时间"], notificationRows.map((n) => [n.id,n.userId,n.type,n.submissionId,!!n.readAt,n.createdAt]));
  add("棉花糖", ["棉花糖 ID","投稿用户名","内容","允许公开","投稿时间","已读时间","公开时间","是否移除","移除时间"], marshmallowRows.map((m) => [m.id,usernames.get(m.userId),m.content,m.allowPublic,m.createdAt,m.readAt,m.publishedAt,!!m.deletedAt,m.deletedAt]));
  add("用户评价", ["评价 ID","投稿 ID","用户名","推荐","评论","创建时间","更新时间"], reviewRows.map((r) => [r.id,r.submissionId,usernames.get(r.userId),r.recommend,r.comment,r.createdAt,r.updatedAt]));
  add("主题设置", ["网站名称","网站副标题","网页图标地址","自定义字体地址","推荐单首页插画地址","背景类型","电脑背景地址","手机背景地址","主色","辅助色","强调色","页面背景色","菜单透明度","大卡片透明度","普通卡片透明度","遮罩强度","更新时间"], settingsRows.map((s) => [s.siteName,s.siteTagline,s.siteIconUrl,s.customFontUrl,s.recommendationHeroImageUrl,s.backgroundType,s.backgroundImageUrl,s.backgroundImageMobileUrl,s.primaryColor,s.secondaryColor,s.accentColor,s.backgroundColor,s.navOpacity,s.heroOpacity,s.cardOpacity,s.backgroundOverlay,s.updatedAt]));
  add("页面文案", ["推荐单主标题","推荐单强调标题","推荐单副标题","推荐单列表标题","美食家主标题","美食家副标题","美食家列表标题","许愿箱主标题","许愿箱副标题","许愿箱列表标题","棉花糖主标题","棉花糖副标题","棉花糖公开墙标题","更新时间"], copyRows.map((s) => [s.recommendationHeroTitle,s.recommendationHeroAccent,s.recommendationTagline,s.recommendationSectionTitle,s.foodHeroTitle,s.foodTagline,s.foodSectionTitle,s.wishHeroTitle,s.wishTagline,s.wishSectionTitle,s.marshmallowHeroTitle,s.marshmallowTagline,s.marshmallowSectionTitle,s.updatedAt]));
  const bytes = await writeExcelFile(sheets).toBuffer();
  return { filename: `streamer-recommendations-${isoDate()}.xlsx`, bytes };
}

export async function createFullBackup() {
  const JSZip = (await import("jszip")).default;
  const db = getDb();
  const [userRows, submissionRows, replyRows, notificationRows, settingsRows, copyRows, logRows, marshmallowRows, reviewRows] = await Promise.all([
    db.select().from(users), db.select().from(submissions), db.select().from(hostReplies), db.select().from(notifications), db.select().from(siteSettings), db.select().from(siteCopySettings), db.select().from(activityLogs), db.select().from(marshmallows), db.select().from(submissionReviews),
  ]);
  const files = new Map<string, Buffer>();
  files.set("manifest.json", json({ product: "streamer-recommendations", schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), sensitive: true, counts: { users:userRows.length, submissions:submissionRows.length, marshmallows:marshmallowRows.length, submissionReviews:reviewRows.length, replies:replyRows.length, notifications:notificationRows.length, settings:settingsRows.length, siteCopy:copyRows.length, activityLogs:logRows.length } }));
  files.set("schema-version.txt", Buffer.from(`${SCHEMA_VERSION}\n`));
  files.set("users.json", json(userRows)); files.set("submissions.json", json(submissionRows)); files.set("marshmallows.json", json(marshmallowRows)); files.set("submission-reviews.json", json(reviewRows)); files.set("host-replies.json", json(replyRows)); files.set("notifications.json", json(notificationRows)); files.set("site-settings.json", json(settingsRows)); files.set("site-copy-settings.json", json(copyRows)); files.set("activity-logs.json", json(logRows));
  const customBackground = settingsRows[0]?.backgroundType === "custom" && isAllowedBackgroundUrl(settingsRows[0].backgroundImageUrl) ? settingsRows[0].backgroundImageUrl : null;
  const customMobileBackground = settingsRows[0]?.backgroundType === "custom" && isAllowedBackgroundUrl(settingsRows[0].backgroundImageMobileUrl) ? settingsRows[0].backgroundImageMobileUrl : null;
  const siteIcon = isAllowedBackgroundUrl(settingsRows[0]?.siteIconUrl) ? settingsRows[0].siteIconUrl : null;
  const customFont = isAllowedSiteFontUrl(settingsRows[0]?.customFontUrl) ? settingsRows[0].customFontUrl : null;
  const recommendationHero = isAllowedBackgroundUrl(settingsRows[0]?.recommendationHeroImageUrl) ? settingsRows[0].recommendationHeroImageUrl : null;
  if (customBackground) try { const response = await fetch(customBackground); if (response.ok) { const data=Buffer.from(await response.arrayBuffer()); if(data.length<=10*1024*1024) files.set(`assets/background-desktop${extensionFromMime(response.headers.get("content-type"))}`,data); } } catch { /* manifest keeps the source URL when asset fetch is unavailable */ }
  if (customMobileBackground) try { const response = await fetch(customMobileBackground); if (response.ok) { const data=Buffer.from(await response.arrayBuffer()); if(data.length<=10*1024*1024) files.set(`assets/background-mobile${extensionFromMime(response.headers.get("content-type"))}`,data); } } catch { /* manifest keeps the source URL when asset fetch is unavailable */ }
  if (siteIcon) try { const response = await fetch(siteIcon); if (response.ok) { const data=Buffer.from(await response.arrayBuffer()); if(data.length<=2*1024*1024) files.set(`assets/site-icon${extensionFromMime(response.headers.get("content-type"))}`,data); } } catch { /* manifest keeps the source URL when asset fetch is unavailable */ }
  if (customFont) try { const response = await fetch(customFont); if (response.ok) { const data=Buffer.from(await response.arrayBuffer()); if(data.length<=4*1024*1024) files.set("assets/site-font.woff2",data); } } catch { /* manifest keeps the source URL when asset fetch is unavailable */ }
  if (recommendationHero) try { const response = await fetch(recommendationHero); if (response.ok) { const data=Buffer.from(await response.arrayBuffer()); if(data.length<=3*1024*1024) files.set(`assets/recommendation-hero${extensionFromMime(response.headers.get("content-type"))}`,data); } } catch { /* manifest keeps the source URL when asset fetch is unavailable */ }
  files.set("checksums.sha256", Buffer.from([...files.entries()].map(([name,data])=>`${sha256(data)}  ${name}`).join("\n")+"\n"));
  const zip = new JSZip(); files.forEach((data,name)=>zip.file(name,data));
  return { filename:`streamer-recommendations-backup-${isoDate()}.zip`, bytes:await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}}) };
}

function extensionFromMime(mime:string|null){if(mime?.includes("png"))return ".png";if(mime?.includes("webp"))return ".webp";return ".jpg";}

export async function validateBackup(bytes: Buffer) {
  const JSZip = (await import("jszip")).default; const zip=await JSZip.loadAsync(bytes); const required=["manifest.json","schema-version.txt","users.json","submissions.json","marshmallows.json","submission-reviews.json","host-replies.json","notifications.json","site-settings.json","site-copy-settings.json","activity-logs.json","checksums.sha256"];
  for(const name of required) if(!zip.file(name)) throw new Error(`备份缺少 ${name}`);
  const version=(await zip.file("schema-version.txt")!.async("text")).trim(); if(version!==SCHEMA_VERSION) throw new Error(`不支持的 schema 版本：${version}`);
  const checksumLines=(await zip.file("checksums.sha256")!.async("text")).trim().split(/\r?\n/);
  for(const line of checksumLines){const [expected,...rest]=line.split(/\s+/);const name=rest.join(" ");const file=zip.file(name);if(!file)throw new Error(`校验文件缺少 ${name}`);const actual=sha256(Buffer.from(await file.async("uint8array")));if(actual!==expected)throw new Error(`${name} 校验值不匹配`);}
  const read=<T>(name:string)=>zip.file(name)!.async("text").then(text=>JSON.parse(text) as T);
  return { manifest:await read<Record<string,unknown>>("manifest.json"), users:await read<Record<string,unknown>[]>("users.json"), submissions:await read<Record<string,unknown>[]>("submissions.json"), marshmallows:await read<Record<string,unknown>[]>("marshmallows.json"), submissionReviews:await read<Record<string,unknown>[]>("submission-reviews.json"), replies:await read<Record<string,unknown>[]>("host-replies.json"), notifications:await read<Record<string,unknown>[]>("notifications.json"), settings:await read<Record<string,unknown>[]>("site-settings.json"), siteCopy:await read<Record<string,unknown>[]>("site-copy-settings.json"), logs:await read<Record<string,unknown>[]>("activity-logs.json") };
}
