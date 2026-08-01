"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import { z } from "zod";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { getCurrentUser, login, logout, register, requireHost, requireUser } from "@/lib/auth";
import {
  approveBilibiliUser, createHostRecommendation, createMarshmallow, createSubmission, deleteOwnUnreadSubmission, deleteSubmissionReview, markAllNotificationsRead, markMarshmallowRead, markNotificationRead, markReadAndPublish,
  getSettings, restoreMarshmallow, restoreSubmission, saveHostReply, saveSubmissionReview, setPinned, softDelete, softDeleteMarshmallow, updateContentStatus, updateScore, updateSettings,
} from "@/lib/data";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { contrastRatio, hostRecommendationSchema, hostUpdateSchema, marshmallowSchema, scoreSchema, submissionReviewSchema, submissionSchema, themeSchema } from "@/lib/validation";
import { contentStatuses } from "@/lib/config";

function value(form: FormData, key: string) { return String(form.get(key) ?? ""); }
function go(path: string, message: string, type: "error" | "success" = "error"): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${type}=${encodeURIComponent(message)}`);
}
async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && !isSameOrigin(origin, h.get("host"))) throw new Error("来源校验失败");
}
async function clientKey(scope: string) {
  const h = await headers();
  return `${scope}:${h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}`;
}

export async function registerAction(form: FormData) {
  await assertSameOrigin();
  const limit = consumeRateLimit(await clientKey("register"), 5, 60 * 60_000);
  if (!limit.ok) go("/register", `操作太频繁，请 ${limit.retryAfter} 秒后再试`);
  try {
    const result = await register(value(form, "username"), value(form, "password"), value(form, "bilibiliUid"));
    if (!result.ok) go("/register", result.error);
    redirect(`/verify-bilibili?uid=${encodeURIComponent(result.bilibiliUid)}&code=${encodeURIComponent(result.verificationCode)}`);
  } catch (error) { if (String(error).includes("DATABASE_URL_MISSING")) go("/register", "数据库尚未配置，请先完成部署设置"); throw error; }
}

export async function loginAction(form: FormData) {
  await assertSameOrigin();
  const limit = consumeRateLimit(await clientKey("login"), 10, 15 * 60_000);
  if (!limit.ok) go("/login", `尝试次数过多，请 ${limit.retryAfter} 秒后再试`);
  try {
    const result = await login(value(form, "username"), value(form, "password"));
    if (!result.ok) go("/login", result.error);
  } catch (error) { if (String(error).includes("DATABASE_URL_MISSING")) go("/login", "数据库尚未配置，请先完成部署设置"); throw error; }
  const user = await getCurrentUser();
  redirect(user?.role === "host" ? "/host" : "/");
}

export async function logoutAction() { await assertSameOrigin(); await logout(); redirect("/"); }

export async function submitAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const limit = consumeRateLimit(`submit:${user.id}`, 5, 60 * 60_000);
  if (!limit.ok) go("/submit", `投稿有点快，请 ${limit.retryAfter} 秒后再试`);
  const parsed = submissionSchema.safeParse({
    category: value(form, "category"), title: value(form, "title"), description: value(form, "description"),
    externalUrl: value(form, "externalUrl"), anonymousPublic: form.get("anonymousPublic") === "on",
  });
  if (!parsed.success) go("/submit", parsed.error.issues[0]?.message ?? "投稿内容有误");
  await createSubmission(user.id, parsed.data);
  revalidatePath("/me/submissions");
  go("/me/submissions", "投稿已送达神绮爱收件箱", "success");
}

export async function submitMarshmallowAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const limit = consumeRateLimit(`marshmallow:${user.id}`, 10, 60 * 60_000);
  if (!limit.ok) go("/marshmallow", `投递有点快，请 ${limit.retryAfter} 秒后再试`);
  const parsed = marshmallowSchema.safeParse({ content: value(form, "content"), allowPublic: form.get("allowPublic") === "on" });
  if (!parsed.success) go("/marshmallow", parsed.error.issues[0]?.message ?? "棉花糖内容有误");
  await createMarshmallow(user.id, parsed.data);
  revalidatePath("/marshmallow"); revalidatePath("/host/marshmallows"); revalidatePath("/host");
  go("/marshmallow", "棉花糖已送达神绮爱，暂时不会公开", "success");
}

export async function saveSubmissionReviewAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser();
  const parsed = submissionReviewSchema.safeParse({ submissionId: value(form, "submissionId"), recommend: value(form, "recommend"), comment: value(form, "comment") });
  const fallbackId = z.uuid().safeParse(value(form, "submissionId"));
  const returnTo = fallbackId.success ? `/submission/${fallbackId.data}` : "/";
  if (!parsed.success) go(returnTo, parsed.error.issues[0]?.message ?? "评价内容有误");
  const limit = consumeRateLimit(`review:${user.id}`, 20, 60 * 60_000);
  if (!limit.ok) go(returnTo, `评价操作有点快，请 ${limit.retryAfter} 秒后再试`);
  try { await saveSubmissionReview(user.id, { submissionId: parsed.data.submissionId, recommend: parsed.data.recommend === "recommend", comment: parsed.data.comment }); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "评价发布失败"); }
  revalidatePath("/"); revalidatePath(returnTo);
  go(returnTo, "你的评价已保存", "success");
}

export async function deleteSubmissionReviewAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser();
  const parsed = z.uuid().safeParse(value(form, "submissionId"));
  const returnTo = parsed.success ? `/submission/${parsed.data}` : "/";
  if (!parsed.success) go(returnTo, "作品编号无效");
  try { await deleteSubmissionReview(user.id, parsed.data); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "撤回失败"); }
  revalidatePath("/"); revalidatePath(returnTo);
  go(returnTo, "你的评价已撤回", "success");
}

const marshmallowId = (form: FormData) => {
  const parsed = z.uuid().safeParse(value(form, "marshmallowId"));
  return parsed.success ? parsed.data : null;
};

function safeMarshmallowReturnPath(form: FormData, fallback = "/host/marshmallows") {
  const candidate = value(form, "returnTo");
  return candidate.startsWith("/host/marshmallows") && !candidate.startsWith("//") ? candidate : fallback;
}

export async function readMarshmallowAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const id = marshmallowId(form);
  if (!id) go("/host/marshmallows/stage", "棉花糖编号无效");
  let result: Awaited<ReturnType<typeof markMarshmallowRead>>;
  try { result = await markMarshmallowRead(host.id, id); }
  catch (error) { go("/host/marshmallows/stage", error instanceof Error ? error.message : "处理失败"); }
  revalidatePath("/marshmallow"); revalidatePath("/host/marshmallows"); revalidatePath("/host");
  const next = z.uuid().safeParse(value(form, "nextId"));
  const target = next.success ? `/host/marshmallows/stage?id=${next.data}` : "/host/marshmallows/stage";
  go(target, result.published ? "已读并公开到棉花糖墙" : "已读；这颗棉花糖保持私密", "success");
}

export async function deleteMarshmallowAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const id = marshmallowId(form);
  const returnTo = safeMarshmallowReturnPath(form);
  if (!id) go(returnTo, "棉花糖编号无效");
  try { await softDeleteMarshmallow(host.id, id); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "移除失败"); }
  revalidatePath("/marshmallow"); revalidatePath("/host/marshmallows"); revalidatePath("/host");
  go(returnTo, "棉花糖已移除，可在“已移除”列表恢复", "success");
}

export async function restoreMarshmallowAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const id = marshmallowId(form);
  const returnTo = safeMarshmallowReturnPath(form, "/host/marshmallows?status=deleted");
  if (!id) go(returnTo, "棉花糖编号无效");
  try { await restoreMarshmallow(host.id, id); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "恢复失败"); }
  revalidatePath("/host/marshmallows"); revalidatePath("/host");
  go(returnTo, "棉花糖已恢复", "success");
}

export async function createHostRecommendationAction(form: FormData) {
  await assertSameOrigin();
  const host = await requireHost();
  const parsed = hostRecommendationSchema.safeParse({
    category: value(form, "category"), title: value(form, "title"), description: value(form, "description"),
    externalUrl: value(form, "externalUrl"), score: value(form, "score"),
    experience: value(form, "experience"), pin: form.get("pin") === "on", pinNote: value(form, "pinNote"),
  });
  if (!parsed.success) go("/host/recommend", parsed.error.issues[0]?.message ?? "推荐内容有误");
  let row: Awaited<ReturnType<typeof createHostRecommendation>>;
  try { row = await createHostRecommendation(host.id, parsed.data); }
  catch (error) { go("/host/recommend", error instanceof Error ? error.message : "发布失败"); }
  revalidatePath("/"); revalidatePath("/host/library");
  go(`/host/submission/${row.id}`, "神绮爱原创推荐已直接公开", "success");
}

export async function deleteOwnSubmissionAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser();
  const ok = await deleteOwnUnreadSubmission(user.id, value(form, "submissionId"));
  revalidatePath("/me/submissions");
  if (!ok) go("/me/submissions", "只有神绮爱尚未查看的投稿可以撤回");
  go("/me/submissions", "投稿已撤回", "success");
}

export async function readNotificationAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser();
  const id = value(form, "notificationId"); const submissionId = value(form, "submissionId");
  await markNotificationRead(user.id, id); revalidatePath("/me/notifications"); redirect(submissionId ? `/?submission=${submissionId}` : "/me/notifications");
}
export async function readAllNotificationsAction() { await assertSameOrigin(); const user = await requireUser(); await markAllNotificationsRead(user.id); revalidatePath("/me/notifications"); go("/me/notifications", "全部消息已标记为已读", "success"); }

export async function openSubmissionAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const id = value(form, "submissionId");
  await markReadAndPublish(host.id, id); revalidatePath("/"); revalidatePath("/host/inbox"); redirect(`/host/submission/${id}`);
}

export async function softDeleteAction(form: FormData) { await assertSameOrigin(); const host = await requireHost(); await softDelete(host.id, value(form, "submissionId")); revalidatePath("/"); revalidatePath("/host"); go(value(form, "returnTo") || "/host/inbox", "投稿已删除，可在当前列表中恢复", "success"); }
export async function restoreAction(form: FormData) { await assertSameOrigin(); const host = await requireHost(); await restoreSubmission(host.id, value(form, "submissionId")); revalidatePath("/"); revalidatePath("/host"); go(value(form, "returnTo") || "/host/library", "投稿已恢复", "success"); }

export async function statusAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const status = value(form, "contentStatus");
  if (!contentStatuses.includes(status as never)) go(value(form, "returnTo") || "/host/library", "作品状态无效");
  await updateContentStatus(host.id, value(form, "submissionId"), status as (typeof contentStatuses)[number]);
  revalidatePath("/"); revalidatePath("/host/library"); go(value(form, "returnTo") || "/host/library", "作品状态已更新", "success");
}

export async function scoreAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  const parsed = scoreSchema.safeParse(value(form, "score"));
  const returnTo = value(form, "returnTo") || "/host/library";
  if (!parsed.success) go(returnTo, "评分必须是 1～10 的整数");
  try { await updateScore(host.id, value(form, "submissionId"), parsed.data); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "评分失败"); }
  revalidatePath("/"); revalidatePath("/host/library"); go(returnTo, parsed.data ? `已评分 ${parsed.data}/10` : "已清除评分", "success");
}

export async function approveBilibiliUserAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  try { await approveBilibiliUser(host.id, value(form, "userId")); }
  catch (error) { go("/host/users", error instanceof Error ? error.message : "核验失败"); }
  revalidatePath("/host/users"); go("/host/users", "B 站 UID 已核验，用户现在可以登录投稿", "success");
}

export async function pinAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const parsed = hostUpdateSchema.safeParse({ submissionId: value(form, "submissionId"), pinNote: value(form, "pinNote") });
  if (!parsed.success) go("/host/library", "置顶信息无效");
  try { await setPinned(host.id, parsed.data.submissionId, value(form, "pin") === "true", parsed.data.pinNote); }
  catch (error) { go(value(form, "returnTo") || "/host/library", error instanceof Error ? error.message : "置顶失败"); }
  revalidatePath("/"); revalidatePath("/host/library"); go(value(form, "returnTo") || "/host/library", value(form, "pin") === "true" ? "已置顶" : "已取消置顶", "success");
}

export async function replyAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const parsed = hostUpdateSchema.safeParse({
    submissionId: value(form, "submissionId"), reply: value(form, "reply"), republish: form.get("republish") === "on", notifyAgain: form.get("notifyAgain") === "on",
  });
  if (!parsed.success || !parsed.data.reply) go(`/host/submission/${value(form, "submissionId")}`, parsed.error?.issues[0]?.message ?? "请填写感想");
  await saveHostReply(host.id, parsed.data.submissionId, parsed.data.reply, parsed.data.republish, parsed.data.notifyAgain);
  revalidatePath("/"); revalidatePath("/host/library"); go(`/host/submission/${parsed.data.submissionId}`, "神绮爱感想已保存", "success");
}

export async function themeAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  const parsed = themeSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) go("/host/theme", parsed.error.issues[0]?.message ?? "主题设置无效");
  if (contrastRatio("#1f2430", parsed.data.backgroundColor) < 4.5) go("/host/theme", "页面背景与正文颜色对比度过低，请选择更浅的背景色");
  await updateSettings(host.id, { ...parsed.data, cardOpacity: String(parsed.data.cardOpacity), backgroundOverlay: String(parsed.data.backgroundOverlay) });
  revalidatePath("/", "layout"); go("/host/theme", "主题已保存", "success");
}

export async function resetThemeAction() {
  await assertSameOrigin(); const host = await requireHost();
  const current=await getSettings();
  await getDb().delete(siteSettings).where((await import("drizzle-orm")).eq(siteSettings.id, "default"));
  if(current.backgroundType==="custom"&&current.backgroundImageUrl&&process.env.BLOB_READ_WRITE_TOKEN)await del(current.backgroundImageUrl).catch(()=>undefined);
  revalidatePath("/", "layout"); go("/host/theme", `已恢复默认主题（由 ${host.username} 操作）`, "success");
}

export async function uploadBackgroundAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  if (!process.env.BLOB_READ_WRITE_TOKEN) go("/host/theme", "尚未配置 Vercel Blob，仍可使用内置背景");
  const file = form.get("background");
  if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024) go("/host/theme", "请选择不超过 5 MB 的图片");
  const signatures: Record<string, number[][]> = { "image/png": [[0x89,0x50,0x4e,0x47]], "image/jpeg": [[0xff,0xd8,0xff]], "image/webp": [[0x52,0x49,0x46,0x46]] };
  if (!signatures[file.type]) go("/host/theme", "只允许 PNG、JPEG 或 WebP，不允许 SVG");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = signatures[file.type].some((sig) => sig.every((byte, i) => bytes[i] === byte)) && (file.type !== "image/webp" || String.fromCharCode(...bytes.slice(8,12)) === "WEBP");
  if (!valid) go("/host/theme", "文件内容与图片格式不匹配");
  const old = await getDb().select().from(siteSettings).limit(1);
  const extension = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  const blob = await put(`backgrounds/${crypto.randomUUID()}.${extension}`, file, { access: "public", addRandomSuffix: false });
  await getDb().insert(siteSettings).values({ id: "default", backgroundType: "custom", backgroundImageUrl: blob.url, updatedBy: host.id })
    .onConflictDoUpdate({ target: siteSettings.id, set: { backgroundType: "custom", backgroundImageUrl: blob.url, updatedBy: host.id, updatedAt: new Date() } });
  if (old[0]?.backgroundType === "custom" && old[0].backgroundImageUrl) await del(old[0].backgroundImageUrl).catch(() => undefined);
  revalidatePath("/", "layout"); go("/host/theme", "背景图已更新", "success");
}

export async function removeBackgroundAction(){
  await assertSameOrigin(); const host=await requireHost(); const current=await getSettings();
  await getDb().insert(siteSettings).values({id:"default",backgroundType:"built_in",backgroundImageUrl:"builtin:warm",updatedBy:host.id}).onConflictDoUpdate({target:siteSettings.id,set:{backgroundType:"built_in",backgroundImageUrl:"builtin:warm",updatedBy:host.id,updatedAt:new Date()}});
  if(current.backgroundType==="custom"&&current.backgroundImageUrl&&process.env.BLOB_READ_WRITE_TOKEN)await del(current.backgroundImageUrl).catch(()=>undefined);
  revalidatePath("/","layout");go("/host/theme","自定义背景已移除","success");
}
