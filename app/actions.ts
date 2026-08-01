"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import { z } from "zod";
import { getDb } from "@/db";
import { siteCopySettings, siteSettings } from "@/db/schema";
import { getCurrentUser, login, logout, register, replaceOneTimePassword, requireAuthenticatedUser, requireHost, requireUser, resetUserPassword, updateAccountPassword, updateAccountUsername } from "@/lib/auth";
import {
  approveBilibiliUser, createHostRecommendation, createMarshmallow, createSubmission, deleteManagedUser, deleteOwnUnreadMarshmallow, deleteOwnUnreadSubmission, deleteSubmissionReview, markAllNotificationsRead, markMarshmallowRead, markNotificationRead, markReadAndPublish,
  getSettings, restoreMarshmallow, restoreSubmission, saveHostReply, saveSubmissionReview, setManagedUserStatus, setPinned, softDelete, softDeleteMarshmallow, updateAuthoredSubmission, updateContentStatus, updateOwnUnreadMarshmallow, updateScore, updateSettings, updateSiteCopy,
} from "@/lib/data";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isSameOrigin, safeLocalPath } from "@/lib/security";
import { accountPasswordSchema, accountUsernameSchema, changePasswordSchema, contrastRatio, hostRecommendationSchema, hostUpdateSchema, marshmallowSchema, scoreSchema, siteCopySchema, submissionReviewSchema, submissionSchema, themeSchema } from "@/lib/validation";
import { categories, contentStatuses, submissionKind } from "@/lib/config";
import { themePresets } from "@/lib/themes";
import { isBlobStorageConfigured } from "@/lib/blob";

function value(form: FormData, key: string) { return String(form.get(key) ?? ""); }
function go(path: string, message: string, type: "error" | "success" = "error"): never {
  const [pathname, fragment] = safeLocalPath(path).split("#", 2);
  redirect(`${pathname}${pathname.includes("?") ? "&" : "?"}${type}=${encodeURIComponent(message)}${fragment ? `#${fragment}` : ""}`);
}
function revalidatePublicCollections() { revalidatePath("/"); revalidatePath("/food"); revalidatePath("/wishes"); }
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
  let result: Awaited<ReturnType<typeof login>>;
  try {
    result = await login(value(form, "username"), value(form, "password"));
    if (!result.ok) go("/login", result.error);
  } catch (error) { if (String(error).includes("DATABASE_URL_MISSING")) go("/login", "数据库尚未配置，请先完成部署设置"); throw error; }
  if (result.mustChangePassword) redirect("/change-password");
  const user = await getCurrentUser();
  redirect(user?.role === "host" ? "/host" : "/");
}

export async function logoutAction() { await assertSameOrigin(); await logout(); redirect("/"); }

export async function changeOneTimePasswordAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireAuthenticatedUser();
  if (!user.mustChangePassword) redirect("/");
  const parsed = changePasswordSchema.safeParse({ password: value(form, "password"), confirmPassword: value(form, "confirmPassword") });
  if (!parsed.success) go("/change-password", parsed.error.issues[0]?.message ?? "新密码无效");
  try { await replaceOneTimePassword(user.id, parsed.data.password); }
  catch (error) { go("/change-password", error instanceof Error ? error.message : "密码更新失败"); }
  await logout();
  go("/login", "密码已更新，请使用新密码登录", "success");
}

export async function updateAccountUsernameAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const limit = consumeRateLimit(`account-username:${user.id}`, 6, 60 * 60_000);
  if (!limit.ok) go("/me/account", `修改过于频繁，请 ${limit.retryAfter} 秒后再试`);
  const parsed = accountUsernameSchema.safeParse({ username: value(form, "username"), currentPassword: value(form, "currentPassword") });
  if (!parsed.success) go("/me/account", parsed.error.issues[0]?.message ?? "账号信息无效");
  try { await updateAccountUsername(user.id, parsed.data.currentPassword, parsed.data.username); }
  catch (error) { go("/me/account", error instanceof Error ? error.message : "用户名修改失败"); }
  revalidatePath("/", "layout");
  go("/me/account", "用户名已更新", "success");
}

export async function updateAccountPasswordAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const returnTo = value(form, "returnTo") === "/me/account/password" ? "/me/account/password" : "/me/account";
  const limit = consumeRateLimit(`account-password:${user.id}`, 5, 60 * 60_000);
  if (!limit.ok) go(returnTo, `修改过于频繁，请 ${limit.retryAfter} 秒后再试`);
  const parsed = accountPasswordSchema.safeParse({ currentPassword: value(form, "currentPassword"), password: value(form, "password"), confirmPassword: value(form, "confirmPassword") });
  if (!parsed.success) go(returnTo, parsed.error.issues[0]?.message ?? "密码无效");
  try { await updateAccountPassword(user.id, parsed.data.currentPassword, parsed.data.password); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "密码修改失败"); }
  await logout();
  go("/login", "密码已更新，请重新登录", "success");
}

export type ResetPasswordState = { error?: string; oneTimePassword?: string; username?: string };
export async function resetUserPasswordAction(_state: ResetPasswordState, form: FormData): Promise<ResetPasswordState> {
  await assertSameOrigin();
  const host = await requireHost();
  const userId = z.uuid().safeParse(value(form, "userId"));
  if (!userId.success) return { error: "用户编号无效" };
  try {
    const oneTimePassword = await resetUserPassword(host.id, userId.data);
    return { oneTimePassword, username: value(form, "username") };
  } catch (error) { return { error: error instanceof Error ? error.message : "重置失败" }; }
}

export async function submitAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const rawCategory = value(form, "category");
  const validCategory = categories.includes(rawCategory as never) ? rawCategory as (typeof categories)[number] : "book";
  const kind = submissionKind(validCategory);
  const returnTo = kind === "work" ? "/submit" : `/submit?kind=${kind}`;
  const parsed = submissionSchema.safeParse({
    category: rawCategory, title: value(form, "title"), description: value(form, "description"),
    externalUrl: value(form, "externalUrl"), anonymousPublic: form.get("anonymousPublic") === "on",
  });
  if (!parsed.success) go(returnTo, parsed.error.issues[0]?.message ?? "投稿内容有误");
  if (user.role === "host") {
    let row: Awaited<ReturnType<typeof createHostRecommendation>>;
    try {
      row = await createHostRecommendation(user.id, {
        category: parsed.data.category, title: parsed.data.title, description: parsed.data.description,
        externalUrl: parsed.data.externalUrl, score: null, experience: null, pin: false, pinNote: null,
      });
    } catch (error) { go(returnTo, error instanceof Error ? error.message : "发布失败"); }
    revalidatePublicCollections(); revalidatePath("/host/library"); revalidatePath("/me/submissions");
    go(`/host/submission/${row.id}`, "已直接公开，无需审核", "success");
  }
  const limit = consumeRateLimit(`submit:${user.id}`, 5, 60 * 60_000);
  if (!limit.ok) go(returnTo, `投稿有点快，请 ${limit.retryAfter} 秒后再试`);
  await createSubmission(user.id, parsed.data);
  revalidatePath("/me/submissions");
  go("/me/submissions", "投稿已送达神绮爱收件箱", "success");
}

export async function updateOwnSubmissionAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const id = submissionId(form);
  const returnTo = safeLocalPath(value(form, "returnTo") || "/me/submissions");
  if (!id) go(returnTo, "内容编号无效");
  const parsed = submissionSchema.safeParse({
    category: value(form, "category"), title: value(form, "title"), description: value(form, "description"),
    externalUrl: value(form, "externalUrl"), anonymousPublic: form.get("anonymousPublic") === "on",
  });
  if (!parsed.success) go(returnTo, parsed.error.issues[0]?.message ?? "修改内容有误");
  const limit = consumeRateLimit(`submission-edit:${user.id}`, 20, 60 * 60_000);
  if (!limit.ok) go(returnTo, `修改过于频繁，请 ${limit.retryAfter} 秒后再试`);
  try { await updateAuthoredSubmission(user.id, id, parsed.data); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "修改失败"); }
  revalidatePublicCollections(); revalidatePath("/me/submissions"); revalidatePath("/host/inbox"); revalidatePath("/host/library"); revalidatePath(`/submission/${id}`); revalidatePath(`/host/submission/${id}`);
  go(returnTo, "内容已更新", "success");
}

const marshmallowId = (form: FormData) => {
  const parsed = z.uuid().safeParse(value(form, "marshmallowId"));
  return parsed.success ? parsed.data : null;
};
const submissionId = (form: FormData) => {
  const parsed = z.uuid().safeParse(value(form, "submissionId"));
  return parsed.success ? parsed.data : null;
};

export async function submitMarshmallowAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  if (user.role === "host") go("/marshmallow", "主播账号不能投递棉花糖");
  const limit = consumeRateLimit(`marshmallow:${user.id}`, 10, 60 * 60_000);
  if (!limit.ok) go("/marshmallow", `投递有点快，请 ${limit.retryAfter} 秒后再试`);
  const parsed = marshmallowSchema.safeParse({ content: value(form, "content"), allowPublic: form.get("allowPublic") === "on" });
  if (!parsed.success) go("/marshmallow", parsed.error.issues[0]?.message ?? "棉花糖内容有误");
  await createMarshmallow(user.id, parsed.data);
  revalidatePath("/marshmallow"); revalidatePath("/host/marshmallows"); revalidatePath("/host");
  go("/marshmallow", "棉花糖已送达", "success");
}

export async function updateOwnMarshmallowAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser(); const id = marshmallowId(form);
  if (!id) go("/me/submissions", "棉花糖编号无效");
  const parsed = marshmallowSchema.safeParse({ content: value(form, "content"), allowPublic: form.get("allowPublic") === "on" });
  if (!parsed.success) go("/me/submissions", parsed.error.issues[0]?.message ?? "内容有误");
  const limit = consumeRateLimit(`marshmallow-edit:${user.id}`, 20, 60 * 60_000);
  if (!limit.ok) go("/me/submissions", `操作太频繁，请 ${limit.retryAfter} 秒后再试`);
  try { await updateOwnUnreadMarshmallow(user.id, id, parsed.data); }
  catch (error) { go("/me/submissions", error instanceof Error ? error.message : "修改失败"); }
  revalidatePath("/me/submissions"); revalidatePath("/marshmallow"); revalidatePath("/host/marshmallows"); revalidatePath("/host");
  go("/me/submissions", "已修改，排队时间不变", "success");
}

export async function deleteOwnMarshmallowAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser(); const id = marshmallowId(form);
  if (!id) go("/me/submissions", "棉花糖编号无效");
  try { await deleteOwnUnreadMarshmallow(user.id, id); }
  catch (error) { go("/me/submissions", error instanceof Error ? error.message : "删除失败"); }
  revalidatePath("/me/submissions"); revalidatePath("/marshmallow"); revalidatePath("/host/marshmallows"); revalidatePath("/host");
  go("/me/submissions", "棉花糖已删除", "success");
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
  revalidatePublicCollections(); revalidatePath(returnTo);
  go(`${returnTo}#comments`, "你的评价已保存", "success");
}

export async function deleteSubmissionReviewAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser();
  const parsed = z.uuid().safeParse(value(form, "submissionId"));
  const returnTo = parsed.success ? `/submission/${parsed.data}` : "/";
  if (!parsed.success) go(returnTo, "内容编号无效");
  try { await deleteSubmissionReview(user.id, parsed.data); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "撤回失败"); }
  revalidatePublicCollections(); revalidatePath(returnTo);
  go(`${returnTo}#comments`, "你的评价已撤回", "success");
}

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
  go(target, result.published ? "已公开上墙" : "已完成阅读，这颗棉花糖保持私密", "success");
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
  const rawCategory = value(form, "category");
  const validCategory = categories.includes(rawCategory as never) ? rawCategory as (typeof categories)[number] : "book";
  const kind = submissionKind(validCategory);
  const returnTo = kind === "work" ? "/host/recommend" : `/host/recommend?kind=${kind}`;
  if (!parsed.success) go(returnTo, parsed.error.issues[0]?.message ?? "推荐内容有误");
  let row: Awaited<ReturnType<typeof createHostRecommendation>>;
  try { row = await createHostRecommendation(host.id, parsed.data); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "发布失败"); }
  revalidatePublicCollections(); revalidatePath("/host/library");
  go(`/host/submission/${row.id}`, "神绮爱原创推荐已直接公开", "success");
}

export async function deleteOwnSubmissionAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser();
  const id = submissionId(form);
  if (!id) go("/me/submissions", "投稿编号无效");
  const ok = await deleteOwnUnreadSubmission(user.id, id);
  revalidatePath("/me/submissions");
  if (!ok) go("/me/submissions", "只有神绮爱尚未查看的投稿可以撤回");
  go("/me/submissions", "投稿已撤回并永久删除", "success");
}

export async function readNotificationAction(form: FormData) {
  await assertSameOrigin(); const user = await requireUser();
  const id = value(form, "notificationId"); const submissionId = value(form, "submissionId");
  await markNotificationRead(user.id, id); revalidatePath("/me/notifications"); redirect(submissionId ? `/?submission=${submissionId}` : "/me/notifications");
}
export async function readAllNotificationsAction() { await assertSameOrigin(); const user = await requireUser(); await markAllNotificationsRead(user.id); revalidatePath("/me/notifications"); go("/me/notifications", "全部消息已标记为已读", "success"); }

export async function openSubmissionAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const id = submissionId(form);
  if (!id) go("/host/inbox", "投稿编号无效");
  await markReadAndPublish(host.id, id); revalidatePublicCollections(); revalidatePath("/host/inbox"); go(`/host/submission/${id}`, "已公开，体验状态保持不变", "success");
}

export async function softDeleteAction(form: FormData) { await assertSameOrigin(); const host = await requireHost(); const id = submissionId(form); if (!id) go("/host/inbox", "投稿编号无效"); await softDelete(host.id, id); revalidatePublicCollections(); revalidatePath("/host"); go(value(form, "returnTo") || "/host/inbox", "投稿已删除，可在当前列表中恢复", "success"); }
export async function restoreAction(form: FormData) { await assertSameOrigin(); const host = await requireHost(); const id = submissionId(form); if (!id) go("/host/library", "投稿编号无效"); await restoreSubmission(host.id, id); revalidatePublicCollections(); revalidatePath("/host"); go(value(form, "returnTo") || "/host/library", "投稿已恢复", "success"); }

export async function statusAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const status = value(form, "contentStatus");
  const id = submissionId(form);
  if (!id) go("/host/library", "投稿编号无效");
  if (!contentStatuses.includes(status as never)) go(value(form, "returnTo") || "/host/library", "作品状态无效");
  await updateContentStatus(host.id, id, status as (typeof contentStatuses)[number]);
  revalidatePublicCollections(); revalidatePath("/host/library"); go(value(form, "returnTo") || "/host/library", "状态已更新", "success");
}

export async function scoreAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  const id = submissionId(form);
  const parsed = scoreSchema.safeParse(value(form, "score"));
  const returnTo = value(form, "returnTo") || "/host/library";
  if (!id) go(returnTo, "投稿编号无效");
  if (!parsed.success) go(returnTo, "评分必须是 1～10 的整数");
  try { await updateScore(host.id, id, parsed.data); }
  catch (error) { go(returnTo, error instanceof Error ? error.message : "评分失败"); }
  revalidatePublicCollections(); revalidatePath("/host/library"); go(returnTo, parsed.data ? `已评分 ${parsed.data}/10` : "已清除评分", "success");
}

export async function approveBilibiliUserAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  try { await approveBilibiliUser(host.id, value(form, "userId")); }
  catch (error) { go("/host/users", error instanceof Error ? error.message : "核验失败"); }
  revalidatePath("/host/users"); go("/host/users", "B 站 UID 已核验，用户现在可以登录投稿", "success");
}

export async function managedUserStatusAction(form: FormData) {
  await assertSameOrigin();
  const host = await requireHost();
  const userId = z.uuid().safeParse(value(form, "userId"));
  const status = value(form, "status");
  if (!userId.success || (status !== "active" && status !== "banned")) go("/host/users", "用户操作无效");
  try { await setManagedUserStatus(host.id, userId.data, status); }
  catch (error) { go("/host/users", error instanceof Error ? error.message : "用户状态更新失败"); }
  revalidatePath("/host/users");
  go("/host/users", status === "banned" ? "账号已停用，现有登录已失效" : "账号已重新启用", "success");
}

export async function deleteManagedUserAction(form: FormData) {
  await assertSameOrigin();
  const host = await requireHost();
  const userId = z.uuid().safeParse(value(form, "userId"));
  if (!userId.success) go("/host/users", "用户编号无效");
  try { await deleteManagedUser(host.id, userId.data); }
  catch (error) { go("/host/users", error instanceof Error ? error.message : "账号删除失败"); }
  revalidatePath("/host/users"); revalidatePublicCollections(); revalidatePath("/marshmallow");
  go("/host/users", "账号已删除并匿名化，历史内容仍会保留", "success");
}

export async function pinAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const parsed = hostUpdateSchema.safeParse({ submissionId: value(form, "submissionId"), pinNote: value(form, "pinNote") });
  if (!parsed.success) go("/host/library", "置顶信息无效");
  try { await setPinned(host.id, parsed.data.submissionId, value(form, "pin") === "true", parsed.data.pinNote); }
  catch (error) { go(value(form, "returnTo") || "/host/library", error instanceof Error ? error.message : "置顶失败"); }
  revalidatePublicCollections(); revalidatePath("/host/library"); go(value(form, "returnTo") || "/host/library", value(form, "pin") === "true" ? "已置顶" : "已取消置顶", "success");
}

export async function replyAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost(); const parsed = hostUpdateSchema.safeParse({
    submissionId: value(form, "submissionId"), reply: value(form, "reply"), republish: form.get("republish") === "on", notifyAgain: form.get("notifyAgain") === "on",
  });
  if (!parsed.success || !parsed.data.reply) go(`/host/submission/${value(form, "submissionId")}`, parsed.error?.issues[0]?.message ?? "请填写感想");
  await saveHostReply(host.id, parsed.data.submissionId, parsed.data.reply, parsed.data.republish, parsed.data.notifyAgain);
  revalidatePublicCollections(); revalidatePath("/host/library"); go(`/host/submission/${parsed.data.submissionId}`, "内容已保存", "success");
}

export async function themeAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  const current = await getSettings();
  const parsed = themeSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) go("/host/theme", parsed.error.issues[0]?.message ?? "主题设置无效");
  if (contrastRatio("#1f2430", parsed.data.backgroundColor) < 4.5) go("/host/theme", "页面背景与正文颜色对比度过低，请选择更浅的背景色");
  await updateSettings(host.id, {
    ...parsed.data,
    navOpacity: String(parsed.data.navOpacity), heroOpacity: String(parsed.data.heroOpacity),
    cardOpacity: String(parsed.data.cardOpacity), backgroundOverlay: String(parsed.data.backgroundOverlay),
  });
  if (current.backgroundType === "custom" && parsed.data.backgroundType === "built_in" && isBlobStorageConfigured()) await Promise.all([current.backgroundImageUrl,current.backgroundImageMobileUrl].filter((url):url is string=>!!url).map((url)=>del(url).catch(()=>undefined)));
  revalidatePath("/", "layout"); go("/host/theme", "主题已保存", "success");
}

export async function siteCopyAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  const parsed = siteCopySchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) go("/host/theme", parsed.error.issues[0]?.message ?? "页面文案无效");
  const { siteName, siteTagline, ...copy } = parsed.data;
  await updateSiteCopy(host.id, { siteName, siteTagline }, copy);
  revalidatePath("/", "layout"); revalidatePath("/food"); revalidatePath("/wishes"); revalidatePath("/marshmallow");
  go("/host/theme", "页面文案已保存", "success");
}

export async function resetThemeAction() {
  await assertSameOrigin(); const host = await requireHost();
  const current=await getSettings();
  await getDb().delete(siteSettings).where((await import("drizzle-orm")).eq(siteSettings.id, "default"));
  await getDb().delete(siteCopySettings).where((await import("drizzle-orm")).eq(siteCopySettings.id, "default"));
  if(isBlobStorageConfigured())await Promise.all([current.backgroundType==="custom"?current.backgroundImageUrl:null,current.backgroundType==="custom"?current.backgroundImageMobileUrl:null,current.siteIconUrl,current.customFontUrl,current.recommendationHeroImageUrl].filter((url):url is string=>!!url).map((url)=>del(url).catch(()=>undefined)));
  revalidatePath("/", "layout"); go("/host/theme", `已恢复默认主题（由 ${host.username} 操作）`, "success");
}

const MAX_CROPPED_BACKGROUND_SIZE = 2 * 1024 * 1024;
async function croppedBackgroundFile(form: FormData, key: string, label: string) {
  const file = form.get(key);
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_CROPPED_BACKGROUND_SIZE) throw new Error(`${label}必须是裁切后不超过 2 MB 的图片`);
  const signatures: Record<string, number[][]> = { "image/png": [[0x89,0x50,0x4e,0x47]], "image/jpeg": [[0xff,0xd8,0xff]], "image/webp": [[0x52,0x49,0x46,0x46]] };
  if (!signatures[file.type]) throw new Error(`${label}只允许 PNG、JPEG 或 WebP`);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = signatures[file.type].some((signature) => signature.every((byte, index) => bytes[index] === byte)) && (file.type !== "image/webp" || String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");
  if (!valid) throw new Error(`${label}的文件内容与格式不匹配`);
  return file;
}

export async function uploadBackgroundAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  if (!isBlobStorageConfigured()) go("/host/theme", "请先连接 Vercel Blob 并配置真实的 BLOB_READ_WRITE_TOKEN");
  let desktop: File; let mobile: File;
  try {
    [desktop, mobile] = await Promise.all([
      croppedBackgroundFile(form, "backgroundDesktop", "电脑背景"),
      croppedBackgroundFile(form, "backgroundMobile", "手机背景"),
    ]);
  } catch (error) { go("/host/theme", error instanceof Error ? error.message : "裁切图片无效"); }
  if (desktop.size + mobile.size > 4 * 1024 * 1024) go("/host/theme", "两张背景合计不能超过 4 MB，请降低图片质量");
  const old = await getDb().select().from(siteSettings).limit(1);
  const extension = (file: File) => file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  const uploaded: string[] = [];
  try {
    const desktopBlob = await put(`backgrounds/${crypto.randomUUID()}-desktop.${extension(desktop)}`, desktop, { access: "public", addRandomSuffix: false });
    uploaded.push(desktopBlob.url);
    const mobileBlob = await put(`backgrounds/${crypto.randomUUID()}-mobile.${extension(mobile)}`, mobile, { access: "public", addRandomSuffix: false });
    uploaded.push(mobileBlob.url);
    await getDb().insert(siteSettings).values({ id: "default", backgroundType: "custom", backgroundImageUrl: desktopBlob.url, backgroundImageMobileUrl: mobileBlob.url, updatedBy: host.id })
      .onConflictDoUpdate({ target: siteSettings.id, set: { backgroundType: "custom", backgroundImageUrl: desktopBlob.url, backgroundImageMobileUrl: mobileBlob.url, updatedBy: host.id, updatedAt: new Date() } });
  } catch (error) {
    await Promise.all(uploaded.map((url) => del(url).catch(() => undefined)));
    go("/host/theme", error instanceof Error ? `背景上传失败：${error.message}` : "背景上传失败");
  }
  if (old[0]?.backgroundType === "custom") await Promise.all([old[0].backgroundImageUrl,old[0].backgroundImageMobileUrl].filter((url):url is string=>!!url&&!uploaded.includes(url)).map((url)=>del(url).catch(()=>undefined)));
  revalidatePath("/", "layout"); go("/host/theme", "电脑与手机背景已更新", "success");
}

export async function removeBackgroundAction(){
  await assertSameOrigin(); const host=await requireHost(); const current=await getSettings();
  const warm=themePresets.warm;
  await getDb().insert(siteSettings).values({id:"default",backgroundType:"built_in",backgroundImageUrl:warm.backgroundImageUrl,backgroundImageMobileUrl:null,primaryColor:warm.primaryColor,secondaryColor:warm.secondaryColor,accentColor:warm.accentColor,backgroundColor:warm.backgroundColor,navOpacity:String(warm.navOpacity),heroOpacity:String(warm.heroOpacity),cardOpacity:String(warm.cardOpacity),backgroundOverlay:String(warm.backgroundOverlay),updatedBy:host.id}).onConflictDoUpdate({target:siteSettings.id,set:{backgroundType:"built_in",backgroundImageUrl:warm.backgroundImageUrl,backgroundImageMobileUrl:null,primaryColor:warm.primaryColor,secondaryColor:warm.secondaryColor,accentColor:warm.accentColor,backgroundColor:warm.backgroundColor,navOpacity:String(warm.navOpacity),heroOpacity:String(warm.heroOpacity),cardOpacity:String(warm.cardOpacity),backgroundOverlay:String(warm.backgroundOverlay),updatedBy:host.id,updatedAt:new Date()}});
  if(current.backgroundType==="custom"&&isBlobStorageConfigured())await Promise.all([current.backgroundImageUrl,current.backgroundImageMobileUrl].filter((url):url is string=>!!url).map((url)=>del(url).catch(()=>undefined)));
  revalidatePath("/","layout");go("/host/theme","自定义背景已移除","success");
}

const MAX_SITE_ICON_SIZE = 2 * 1024 * 1024;

async function siteIconFile(form: FormData) {
  const file = form.get("siteIcon");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_SITE_ICON_SIZE) throw new Error("网页图标必须是处理后不超过 2 MB 的图片");
  if (file.type !== "image/png") throw new Error("网页图标必须先在浏览器中处理为 PNG");
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (![0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((byte, index) => bytes[index] === byte)) throw new Error("网页图标不是有效的 PNG 图片");
  return file;
}

export async function uploadSiteIconAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  if (!isBlobStorageConfigured()) go("/host/theme", "请先连接 Vercel Blob 并配置真实的 BLOB_READ_WRITE_TOKEN");
  let icon: File;
  try { icon = await siteIconFile(form); }
  catch (error) { go("/host/theme", error instanceof Error ? error.message : "网页图标无效"); }
  const [old] = await getDb().select({ siteIconUrl: siteSettings.siteIconUrl }).from(siteSettings).where((await import("drizzle-orm")).eq(siteSettings.id, "default")).limit(1);
  let uploadedUrl: string | null = null;
  try {
    const blob = await put(`site-icons/${crypto.randomUUID()}.png`, icon, { access: "public", addRandomSuffix: false });
    uploadedUrl = blob.url;
    await getDb().insert(siteSettings).values({ id: "default", siteIconUrl: blob.url, updatedBy: host.id })
      .onConflictDoUpdate({ target: siteSettings.id, set: { siteIconUrl: blob.url, updatedBy: host.id, updatedAt: new Date() } });
  } catch (error) {
    if (uploadedUrl) await del(uploadedUrl).catch(() => undefined);
    go("/host/theme", error instanceof Error ? `网页图标上传失败：${error.message}` : "网页图标上传失败");
  }
  if (old?.siteIconUrl && old.siteIconUrl !== uploadedUrl) await del(old.siteIconUrl).catch(() => undefined);
  revalidatePath("/", "layout"); go("/host/theme", "网页图标已更新", "success");
}

export async function removeSiteIconAction() {
  await assertSameOrigin(); const host = await requireHost();
  const [current] = await getDb().select({ siteIconUrl: siteSettings.siteIconUrl }).from(siteSettings).where((await import("drizzle-orm")).eq(siteSettings.id, "default")).limit(1);
  await getDb().insert(siteSettings).values({ id: "default", siteIconUrl: null, updatedBy: host.id })
    .onConflictDoUpdate({ target: siteSettings.id, set: { siteIconUrl: null, updatedBy: host.id, updatedAt: new Date() } });
  if (current?.siteIconUrl && isBlobStorageConfigured()) await del(current.siteIconUrl).catch(() => undefined);
  revalidatePath("/", "layout"); go("/host/theme", "网页图标已移除", "success");
}

const MAX_SITE_FONT_SIZE = 4 * 1024 * 1024;

async function siteFontFile(form: FormData) {
  const file = form.get("siteFont");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_SITE_FONT_SIZE) throw new Error("字体必须是一个不超过 4 MB 的 WOFF2 文件");
  const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (String.fromCharCode(...bytes) !== "wOF2") throw new Error("文件内容不是有效的 WOFF2 字体");
  return file;
}

export async function uploadSiteFontAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  if (!isBlobStorageConfigured()) go("/host/theme", "请先连接 Vercel Blob 并配置真实的 BLOB_READ_WRITE_TOKEN");
  let font: File;
  try { font = await siteFontFile(form); }
  catch (error) { go("/host/theme", error instanceof Error ? error.message : "字体文件无效"); }
  const [old] = await getDb().select({ customFontUrl: siteSettings.customFontUrl }).from(siteSettings).where((await import("drizzle-orm")).eq(siteSettings.id, "default")).limit(1);
  let uploadedUrl: string | null = null;
  try {
    const blob = await put(`site-fonts/${crypto.randomUUID()}.woff2`, font, { access: "public", addRandomSuffix: false, contentType: "font/woff2" });
    uploadedUrl = blob.url;
    await getDb().insert(siteSettings).values({ id: "default", customFontUrl: blob.url, updatedBy: host.id })
      .onConflictDoUpdate({ target: siteSettings.id, set: { customFontUrl: blob.url, updatedBy: host.id, updatedAt: new Date() } });
  } catch (error) {
    if (uploadedUrl) await del(uploadedUrl).catch(() => undefined);
    go("/host/theme", error instanceof Error ? `字体上传失败：${error.message}` : "字体上传失败");
  }
  if (old?.customFontUrl && old.customFontUrl !== uploadedUrl) await del(old.customFontUrl).catch(() => undefined);
  revalidatePath("/", "layout"); go("/host/theme", "全站字体已更新", "success");
}

export async function removeSiteFontAction() {
  await assertSameOrigin(); const host = await requireHost();
  const [current] = await getDb().select({ customFontUrl: siteSettings.customFontUrl }).from(siteSettings).where((await import("drizzle-orm")).eq(siteSettings.id, "default")).limit(1);
  await getDb().insert(siteSettings).values({ id: "default", customFontUrl: null, updatedBy: host.id })
    .onConflictDoUpdate({ target: siteSettings.id, set: { customFontUrl: null, updatedBy: host.id, updatedAt: new Date() } });
  if (current?.customFontUrl && isBlobStorageConfigured()) await del(current.customFontUrl).catch(() => undefined);
  revalidatePath("/", "layout"); go("/host/theme", "已恢复系统字体", "success");
}

const MAX_RECOMMENDATION_HERO_SIZE = 3 * 1024 * 1024;

async function recommendationHeroFile(form: FormData) {
  const file = form.get("recommendationHeroImage");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_RECOMMENDATION_HERO_SIZE) throw new Error("首页插画必须是处理后不超过 3 MB 的图片");
  if (file.type !== "image/webp") throw new Error("首页插画必须先在浏览器中处理为 WebP");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = [0x52,0x49,0x46,0x46].every((byte, index) => bytes[index] === byte) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!valid) throw new Error("首页插画不是有效的 WebP 图片");
  return file;
}

export async function uploadRecommendationHeroImageAction(form: FormData) {
  await assertSameOrigin(); const host = await requireHost();
  if (!isBlobStorageConfigured()) go("/host/theme", "请先连接 Vercel Blob 并配置真实的 BLOB_READ_WRITE_TOKEN");
  let image: File;
  try { image = await recommendationHeroFile(form); }
  catch (error) { go("/host/theme", error instanceof Error ? error.message : "首页插画无效"); }
  const [old] = await getDb().select({ url: siteSettings.recommendationHeroImageUrl }).from(siteSettings).where((await import("drizzle-orm")).eq(siteSettings.id, "default")).limit(1);
  let uploadedUrl: string | null = null;
  try {
    const blob = await put(`recommendation-hero/${crypto.randomUUID()}.webp`, image, { access: "public", addRandomSuffix: false });
    uploadedUrl = blob.url;
    await getDb().insert(siteSettings).values({ id: "default", recommendationHeroImageUrl: blob.url, updatedBy: host.id })
      .onConflictDoUpdate({ target: siteSettings.id, set: { recommendationHeroImageUrl: blob.url, updatedBy: host.id, updatedAt: new Date() } });
  } catch (error) {
    if (uploadedUrl) await del(uploadedUrl).catch(() => undefined);
    go("/host/theme", error instanceof Error ? `首页插画上传失败：${error.message}` : "首页插画上传失败");
  }
  if (old?.url && old.url !== uploadedUrl) await del(old.url).catch(() => undefined);
  revalidatePath("/"); go("/host/theme", "推荐单首页插画已更新", "success");
}

export async function removeRecommendationHeroImageAction() {
  await assertSameOrigin(); const host = await requireHost();
  const [current] = await getDb().select({ url: siteSettings.recommendationHeroImageUrl }).from(siteSettings).where((await import("drizzle-orm")).eq(siteSettings.id, "default")).limit(1);
  await getDb().insert(siteSettings).values({ id: "default", recommendationHeroImageUrl: null, updatedBy: host.id })
    .onConflictDoUpdate({ target: siteSettings.id, set: { recommendationHeroImageUrl: null, updatedBy: host.id, updatedAt: new Date() } });
  if (current?.url && isBlobStorageConfigured()) await del(current.url).catch(() => undefined);
  revalidatePath("/"); go("/host/theme", "推荐单首页插画已移除", "success");
}
