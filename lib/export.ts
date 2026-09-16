import { getDb } from "@/db";
import { activityLogs, hostMusings, hostReplies, marshmallows, notifications, radioEntries, radioEpisodes, reviewReplies, siteCopySettings, siteSettings, submissionReviews, submissions, users } from "@/db/schema";
import { isAllowedBackgroundUrl, isAllowedSiteFontUrl, safeSpreadsheetCell, sha256 } from "./security";
import type { Cell, Sheet, SheetData } from "write-excel-file/node";

export const SCHEMA_VERSION = "15";
const isoDate = () => new Date().toISOString().slice(0, 10);
const json = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2));
// Excel cells allow 32,767 characters; radio stories can be longer. Keep both
// pieces below the limit, including formula-escaping, without splitting emoji.
function radioContentCells(content: string) {
  const boundary = /[\uD800-\uDBFF]/.test(content.charAt(29_999)) ? 29_999 : 30_000;
  return [content.slice(0, boundary), content.slice(boundary)];
}

export async function createXlsxExport() {
  const writeExcelFile = (await import("write-excel-file/node")).default;
  const db = getDb();
  const [submissionRows, userRows, notificationRows, settingsRows, copyRows, marshmallowRows, reviewRows, reviewReplyRows, hostMusingRows, radioEpisodeRows, radioEntryRows] = await Promise.all([
    db.select().from(submissions), db.select().from(users), db.select().from(notifications), db.select().from(siteSettings), db.select().from(siteCopySettings), db.select().from(marshmallows), db.select().from(submissionReviews), db.select().from(reviewReplies), db.select().from(hostMusings), db.select().from(radioEpisodes), db.select().from(radioEntries),
  ]);
  const replies = await db.select().from(hostReplies);
  const usernames = new Map(userRows.map((row) => [row.id, row.username]));
  const replyMap = new Map(replies.map((row) => [row.submissionId, row]));
  const sheets: Sheet<Buffer>[]=[];
  const excelCell=(input:unknown):Cell=>{const value=safeSpreadsheetCell(input);if(value===null||value===undefined)return null;if(value instanceof Date||typeof value==="string"||typeof value==="number"||typeof value==="boolean")return value;return String(value);};
  const add = (name: string, columns: string[], rows: unknown[][]) => {
    const header=columns.map((value)=>({value,fontWeight:"bold" as const,textColor:"#ffffff",backgroundColor:"#7259d9",wrap:true}));
    const data:SheetData=[header,...rows.map(row=>row.map(excelCell))];
    sheets.push({sheet:name,data,dateFormat:"yyyy-mm-dd hh:mm:ss",stickyRowsCount:1,showGridLines:true,columns:columns.map(()=>({width:22}))});
  };
  add("投稿", ["投稿 ID","来源","分类","作品名称","推荐介绍","相关链接","投稿用户名","是否匿名展示","投稿时间","神绮爱查看时间","首次公开时间","首页最后活跃时间","作品状态","作品完成时间","神绮爱评分","是否置顶","置顶时间","置顶推荐语","神绮爱感想","感想发布时间","是否删除","删除时间"], submissionRows.map((s) => { const r=replyMap.get(s.id); return [s.id,s.source,s.category,s.title,s.description,s.externalUrl,usernames.get(s.userId),s.anonymousPublic,s.createdAt,s.hostReadAt,s.publishedAt,s.feedActivityAt,s.contentStatus,s.contentCompletedAt,s.score,!!s.pinnedAt,s.pinnedAt,s.pinNote,r?.content,r?.publishedAt,!!s.deletedAt,s.deletedAt]; }));
  const submissionCounts = new Map<string, number>(); submissionRows.forEach((s) => submissionCounts.set(s.userId, (submissionCounts.get(s.userId)??0)+1));
  add("用户", ["用户 ID","用户名","B站 UID","UID 已核验","角色","状态","注册时间","删除时间","投稿数量"], userRows.map((u) => [u.id,u.username,u.bilibiliUid,!!u.bilibiliVerifiedAt,u.role,u.status,u.createdAt,u.deletedAt,submissionCounts.get(u.id)??0]));
  add("通知", ["通知 ID","接收用户 ID","类型","投稿 ID","是否已读","创建时间"], notificationRows.map((n) => [n.id,n.userId,n.type,n.submissionId,!!n.readAt,n.createdAt]));
  add("棉花糖", ["棉花糖 ID","投稿用户名","内容","允许公开","投稿时间","已读时间","公开时间","下架时间","主播回复","回复时间","回复更新时间","回复者","是否移除","移除时间"], marshmallowRows.map((m) => [m.id,usernames.get(m.userId),m.content,m.allowPublic,m.createdAt,m.readAt,m.publishedAt,m.unpublishedAt,m.replyContent,m.repliedAt,m.replyUpdatedAt,m.repliedBy?usernames.get(m.repliedBy):null,!!m.deletedAt,m.deletedAt]));
  add("碎碎念", ["碎碎念 ID","主播用户名","内容","是否置顶","置顶时间","发布时间","更新时间"], hostMusingRows.map((m) => [m.id,usernames.get(m.hostUserId),m.content,!!m.pinnedAt,m.pinnedAt,m.createdAt,m.updatedAt]));
  const radioEpisodeTitles = new Map(radioEpisodeRows.map((episode) => [episode.id, episode.title]));
  add("电台期数", ["期数 ID","期号","主题","主播用户名","状态","发布时间","创建时间","更新时间"], radioEpisodeRows.map((episode) => [episode.id,episode.episodeNumber,episode.title,usernames.get(episode.hostUserId),episode.publishedAt?"已发布":"草稿",episode.publishedAt,episode.createdAt,episode.updatedAt]));
  add("电台内容", ["内容 ID","期数 ID","所属主题","类型","目录顺序","标题","正文","正文（续）","创建时间","更新时间"], radioEntryRows.map((entry) => [entry.id,entry.episodeId,radioEpisodeTitles.get(entry.episodeId),entry.kind==="submission"?"观众投稿":"故事",entry.position,entry.title,...radioContentCells(entry.content),entry.createdAt,entry.updatedAt]));
  add("用户评价", ["评价 ID","投稿 ID","用户名","推荐","评论","创建时间","更新时间"], reviewRows.map((r) => [r.id,r.submissionId,usernames.get(r.userId),r.recommend,r.comment,r.createdAt,r.updatedAt]));
  add("评价回复", ["回复 ID","主评价 ID","用户名","回复目标用户名","内容","创建时间","更新时间"], reviewReplyRows.map((r) => [r.id,r.reviewId,usernames.get(r.userId),r.replyToUserId?usernames.get(r.replyToUserId):null,r.content,r.createdAt,r.updatedAt]));
  add("主题设置", ["网站名称","网站副标题","网页图标地址","自定义字体地址","背景类型","电脑背景地址","手机背景地址","主色","辅助色","强调色","页面背景色","菜单透明度","菜单毛玻璃","大卡片透明度","大卡片毛玻璃","搜索栏透明度","搜索栏毛玻璃","普通卡片透明度","普通卡片毛玻璃","背景悬浮文字雾气浓度","遮罩强度","更新时间"], settingsRows.map((s) => [s.siteName,s.siteTagline,s.siteIconUrl,s.customFontUrl,s.backgroundType,s.backgroundImageUrl,s.backgroundImageMobileUrl,s.primaryColor,s.secondaryColor,s.accentColor,s.backgroundColor,s.navOpacity,s.navBlur,s.heroOpacity,s.heroBlur,s.filterOpacity,s.filterBlur,s.cardOpacity,s.cardBlur,s.ambientTextMist,s.backgroundOverlay,s.updatedAt]));
  add("页面文案", ["推荐单主标题","推荐单强调标题","推荐单副标题","推荐单列表标题","美食家主标题","美食家副标题","美食家列表标题","许愿箱主标题","许愿箱副标题","许愿箱列表标题","棉花糖主标题","棉花糖副标题","棉花糖公开墙标题","碎碎念主标题","碎碎念副标题","碎碎念列表标题","更新时间"], copyRows.map((s) => [s.recommendationHeroTitle,s.recommendationHeroAccent,s.recommendationTagline,s.recommendationSectionTitle,s.foodHeroTitle,s.foodTagline,s.foodSectionTitle,s.wishHeroTitle,s.wishTagline,s.wishSectionTitle,s.marshmallowHeroTitle,s.marshmallowTagline,s.marshmallowSectionTitle,s.musingsHeroTitle,s.musingsTagline,s.musingsSectionTitle,s.updatedAt]));
  const bytes = await writeExcelFile(sheets).toBuffer();
  return { filename: `streamer-recommendations-${isoDate()}.xlsx`, bytes };
}

export async function createFullBackup() {
  const JSZip = (await import("jszip")).default;
  const db = getDb();
  const [userRows, submissionRows, replyRows, notificationRows, settingsRows, copyRows, logRows, marshmallowRows, reviewRows, reviewReplyRows, hostMusingRows, radioEpisodeRows, radioEntryRows] = await Promise.all([
    db.select().from(users), db.select().from(submissions), db.select().from(hostReplies), db.select().from(notifications), db.select().from(siteSettings), db.select().from(siteCopySettings), db.select().from(activityLogs), db.select().from(marshmallows), db.select().from(submissionReviews), db.select().from(reviewReplies), db.select().from(hostMusings), db.select().from(radioEpisodes), db.select().from(radioEntries),
  ]);
  const files = new Map<string, Buffer>();
  files.set("manifest.json", json({ product: "streamer-recommendations", schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), sensitive: true, counts: { users:userRows.length, submissions:submissionRows.length, marshmallows:marshmallowRows.length, hostMusings:hostMusingRows.length, radioEpisodes:radioEpisodeRows.length, radioEntries:radioEntryRows.length, submissionReviews:reviewRows.length, reviewReplies:reviewReplyRows.length, replies:replyRows.length, notifications:notificationRows.length, settings:settingsRows.length, siteCopy:copyRows.length, activityLogs:logRows.length } }));
  files.set("schema-version.txt", Buffer.from(`${SCHEMA_VERSION}\n`));
  files.set("users.json", json(userRows)); files.set("submissions.json", json(submissionRows)); files.set("marshmallows.json", json(marshmallowRows)); files.set("host-musings.json", json(hostMusingRows)); files.set("submission-reviews.json", json(reviewRows)); files.set("review-replies.json", json(reviewReplyRows)); files.set("host-replies.json", json(replyRows)); files.set("notifications.json", json(notificationRows)); files.set("site-settings.json", json(settingsRows)); files.set("site-copy-settings.json", json(copyRows)); files.set("activity-logs.json", json(logRows));
  files.set("radio-episodes.json", json(radioEpisodeRows)); files.set("radio-entries.json", json(radioEntryRows));
  const customBackground = settingsRows[0]?.backgroundType === "custom" && isAllowedBackgroundUrl(settingsRows[0].backgroundImageUrl) ? settingsRows[0].backgroundImageUrl : null;
  const customMobileBackground = settingsRows[0]?.backgroundType === "custom" && isAllowedBackgroundUrl(settingsRows[0].backgroundImageMobileUrl) ? settingsRows[0].backgroundImageMobileUrl : null;
  const siteIcon = isAllowedBackgroundUrl(settingsRows[0]?.siteIconUrl) ? settingsRows[0].siteIconUrl : null;
  const customFont = isAllowedSiteFontUrl(settingsRows[0]?.customFontUrl) ? settingsRows[0].customFontUrl : null;
  if (customBackground) try { const response = await fetch(customBackground); if (response.ok) { const data=Buffer.from(await response.arrayBuffer()); if(data.length<=10*1024*1024) files.set(`assets/background-desktop${extensionFromMime(response.headers.get("content-type"))}`,data); } } catch { /* manifest keeps the source URL when asset fetch is unavailable */ }
  if (customMobileBackground) try { const response = await fetch(customMobileBackground); if (response.ok) { const data=Buffer.from(await response.arrayBuffer()); if(data.length<=10*1024*1024) files.set(`assets/background-mobile${extensionFromMime(response.headers.get("content-type"))}`,data); } } catch { /* manifest keeps the source URL when asset fetch is unavailable */ }
  if (siteIcon) try { const response = await fetch(siteIcon); if (response.ok) { const data=Buffer.from(await response.arrayBuffer()); if(data.length<=2*1024*1024) files.set(`assets/site-icon${extensionFromMime(response.headers.get("content-type"))}`,data); } } catch { /* manifest keeps the source URL when asset fetch is unavailable */ }
  if (customFont) try { const response = await fetch(customFont); if (response.ok) { const data=Buffer.from(await response.arrayBuffer()); if(data.length<=4*1024*1024) files.set("assets/site-font.woff2",data); } } catch { /* manifest keeps the source URL when asset fetch is unavailable */ }
  files.set("checksums.sha256", Buffer.from([...files.entries()].map(([name,data])=>`${sha256(data)}  ${name}`).join("\n")+"\n"));
  const zip = new JSZip(); files.forEach((data,name)=>zip.file(name,data));
  return { filename:`streamer-recommendations-backup-${isoDate()}.zip`, bytes:await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}}) };
}

function extensionFromMime(mime:string|null){if(mime?.includes("png"))return ".png";if(mime?.includes("webp"))return ".webp";return ".jpg";}

export async function validateBackup(bytes: Buffer) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const required = ["manifest.json","schema-version.txt","users.json","submissions.json","marshmallows.json","host-musings.json","submission-reviews.json","review-replies.json","host-replies.json","notifications.json","site-settings.json","site-copy-settings.json","activity-logs.json","checksums.sha256"];
  for (const name of required) if (!zip.file(name)) throw new Error(`备份缺少 ${name}`);
  const version = (await zip.file("schema-version.txt")!.async("text")).trim();
  if (!["13", "14", SCHEMA_VERSION].includes(version)) throw new Error(`不支持的 schema 版本：${version}`);
  const radioFiles = ["radio-episodes.json", "radio-entries.json"];
  for (const name of radioFiles) {
    if (version === SCHEMA_VERSION && !zip.file(name)) throw new Error(`备份缺少 ${name}`);
    if (zip.file(name)) required.push(name);
  }
  const checksumLines = (await zip.file("checksums.sha256")!.async("text")).trim().split(/\r?\n/);
  const checkedFiles = new Set<string>();
  for (const line of checksumLines) {
    const [expected, ...rest] = line.split(/\s+/);
    const name = rest.join(" ");
    const file = zip.file(name);
    if (!file) throw new Error(`校验文件缺少 ${name}`);
    const actual = sha256(Buffer.from(await file.async("uint8array")));
    if (actual !== expected) throw new Error(`${name} 校验值不匹配`);
    checkedFiles.add(name);
  }
  for (const name of required) {
    if (name !== "checksums.sha256" && !checkedFiles.has(name)) throw new Error(`备份缺少 ${name} 的校验值`);
  }
  const read = <T>(name: string) => zip.file(name)!.async("text").then(text => JSON.parse(text) as T);
  const readRows = async (name: string, optional = false): Promise<Record<string, unknown>[]> => {
    if (optional && !zip.file(name)) return [];
    const rows = await read<unknown>(name);
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error(`${name} 必须是记录数组`);
    return rows;
  };
  const manifest = await read<Record<string, unknown>>("manifest.json");
  if (manifest.schemaVersion !== version) throw new Error("manifest.json 与 schema-version.txt 的版本不一致");
  return {
    manifest,
    users: await readRows("users.json"), submissions: await readRows("submissions.json"),
    marshmallows: await readRows("marshmallows.json"), hostMusings: await readRows("host-musings.json"),
    radioEpisodes: await readRows("radio-episodes.json", true), radioEntries: await readRows("radio-entries.json", true),
    submissionReviews: await readRows("submission-reviews.json"), reviewReplies: await readRows("review-replies.json"),
    replies: await readRows("host-replies.json"), notifications: await readRows("notifications.json"),
    settings: await readRows("site-settings.json"), siteCopy: await readRows("site-copy-settings.json"), logs: await readRows("activity-logs.json"),
  };
}
