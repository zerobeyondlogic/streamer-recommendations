"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { getCurrentUser, login, logout, register, requireHost, requireUser } from "@/lib/auth";
import {
  createSubmission, deleteOwnUnreadSubmission, markAllNotificationsRead, markNotificationRead, markReadAndPublish,
  getSettings, restoreSubmission, saveHostReply, setPinned, softDelete, updateContentStatus, updateSettings,
} from "@/lib/data";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { contrastRatio, hostUpdateSchema, submissionSchema, themeSchema } from "@/lib/validation";
import { contentStatuses } from "@/lib/config";

function value(form: FormData, key: string) { return String(form.get(key) ?? ""); }
function go(path: string, message: string, type: "error" | "success" = "error"): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
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
    const result = await register(value(form, "username"), value(form, "password"));
    if (!result.ok) go("/register", result.error);
  } catch (error) { if (String(error).includes("DATABASE_URL_MISSING")) go("/register", "数据库尚未配置，请先完成部署设置"); throw error; }
  redirect("/submit");
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
  go("/me/submissions", "投稿已送达主播收件箱", "success");
}

export async function deleteOwnSubmissionAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser();
  const ok = await deleteOwnUnreadSubmission(user.id, value(form, "submissionId"));
  revalidatePath("/me/submissions");
  if (!ok) go("/me/submissions", "只有主播尚未查看的投稿可以撤回");
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
  revalidatePath("/"); revalidatePath("/host/library"); go(`/host/submission/${parsed.data.submissionId}`, "主播感想已保存", "success");
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
