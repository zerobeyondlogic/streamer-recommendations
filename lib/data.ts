import "server-only";
import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { activityLogs, hostReplies, notifications, siteSettings, submissions, users } from "@/db/schema";
import { MAX_PINNED_SUBMISSIONS, type Category, type ContentStatus, type FeedSort } from "./config";
import { normalizeTitle, publicSubmitter } from "./security";
import { firstOpenPatch, replyEffects } from "./transitions";

export const defaultSettings = {
  id: "default", siteName: "主播的作品放映室", siteTagline: "把你喜欢的作品，轻轻放进我的收件箱",
  backgroundType: "built_in" as const, backgroundImageUrl: null, primaryColor: "#7259d9", secondaryColor: "#ff9f76",
  accentColor: "#f4c95d", backgroundColor: "#fff9f2", cardOpacity: "0.94", backgroundOverlay: "0.30", updatedBy: null, updatedAt: new Date(0),
};

export async function getSettings() {
  try { const [value] = await getDb().select().from(siteSettings).where(eq(siteSettings.id, "default")).limit(1); return value ?? defaultSettings; }
  catch (error) { if (String(error).includes("DATABASE_URL_MISSING")) return defaultSettings; throw error; }
}

export async function getPublicFeed(filters: { category?: string; status?: string; q?: string; hostRecommended?: boolean; sort?: FeedSort; page?: number } = {}) {
  try {
    const conditions = [isNotNull(submissions.publishedAt), isNull(submissions.deletedAt)];
    if (filters.category) conditions.push(eq(submissions.category, filters.category as Category));
    if (filters.status) conditions.push(eq(submissions.contentStatus, filters.status as ContentStatus));
    if (filters.q) conditions.push(ilike(submissions.normalizedTitle, `%${normalizeTitle(filters.q)}%`));
    if (filters.hostRecommended) {
      const hostRecommended = or(eq(submissions.source, "host"), isNotNull(submissions.pinnedAt));
      if (hostRecommended) conditions.push(hostRecommended);
    }
    const page = Math.max(1, filters.page ?? 1);
    const rows = await getDb().select({
      id: submissions.id, category: submissions.category, title: submissions.title, description: submissions.description,
      externalUrl: submissions.externalUrl, anonymousPublic: submissions.anonymousPublic, username: users.username,
      createdAt: submissions.createdAt, publishedAt: submissions.publishedAt, feedActivityAt: submissions.feedActivityAt,
      contentStatus: submissions.contentStatus, pinnedAt: submissions.pinnedAt, pinNote: submissions.pinNote,
      source: submissions.source, score: submissions.score,
      reply: hostReplies.content, replyPublishedAt: hostReplies.publishedAt,
    }).from(submissions).innerJoin(users, eq(submissions.userId, users.id)).leftJoin(hostReplies, eq(hostReplies.submissionId, submissions.id))
      .where(and(...conditions))
      .orderBy(
        desc(sql`${submissions.pinnedAt} is not null`),
        desc(submissions.pinnedAt),
        ...(filters.sort === "score" ? [sql`${submissions.score} desc nulls last`, desc(submissions.feedActivityAt)] : [desc(submissions.feedActivityAt)]),
      )
      .limit(20).offset((page - 1) * 20);
    return rows.map(({ anonymousPublic, username, ...row }) => ({ ...row, submitter: publicSubmitter(anonymousPublic, username) }));
  } catch (error) { if (String(error).includes("DATABASE_URL_MISSING")) return []; throw error; }
}


export async function createSubmission(userId: string, data: { category: Category; title: string; description: string | null; externalUrl: string | null; anonymousPublic: boolean }) {
  const [row] = await getDb().insert(submissions).values({ userId, ...data, normalizedTitle: normalizeTitle(data.title) }).returning({ id: submissions.id });
  await getDb().insert(activityLogs).values({ actorUserId: userId, submissionId: row.id, action: "submission_created" });
  return row;
}

export async function createHostRecommendation(hostId: string, data: {
  category: Category; title: string; description: string | null; externalUrl: string | null;
  contentStatus: ContentStatus; score: number | null; experience: string | null; pin: boolean; pinNote: string | null;
}) {
  return getDb().transaction(async (tx) => {
    if (data.pin) {
      const [total] = await tx.select({ value: count() }).from(submissions).where(and(isNotNull(submissions.pinnedAt), isNull(submissions.deletedAt)));
      if (total.value >= MAX_PINNED_SUBMISSIONS) throw new Error(`最多置顶 ${MAX_PINNED_SUBMISSIONS} 条`);
    }
    const now = new Date();
    const [row] = await tx.insert(submissions).values({
      userId: hostId, source: "host", category: data.category, title: data.title,
      normalizedTitle: normalizeTitle(data.title), description: data.description, externalUrl: data.externalUrl,
      anonymousPublic: false, hostReadAt: now, publishedAt: now, feedActivityAt: now,
      contentStatus: data.contentStatus, contentCompletedAt: data.contentStatus === "completed" ? now : null,
      score: data.score, pinnedAt: data.pin ? now : null, pinnedBy: data.pin ? hostId : null, pinNote: data.pin ? data.pinNote : null,
    }).returning({ id: submissions.id });
    if (data.experience) await tx.insert(hostReplies).values({ submissionId: row.id, hostUserId: hostId, content: data.experience, publishedAt: now });
    await tx.insert(activityLogs).values({ actorUserId: hostId, submissionId: row.id, action: "host_recommendation_created", metadata: { pinned: data.pin, score: data.score } });
    return row;
  });
}

export async function getMySubmissions(userId: string) {
  return getDb().select({
    id: submissions.id, title: submissions.title, category: submissions.category, createdAt: submissions.createdAt,
    hostReadAt: submissions.hostReadAt, publishedAt: submissions.publishedAt, anonymousPublic: submissions.anonymousPublic,
    contentStatus: submissions.contentStatus, score: submissions.score, deletedAt: submissions.deletedAt, reply: hostReplies.content,
    unread: sql<boolean>`exists(select 1 from ${notifications} n where n.submission_id = ${submissions.id} and n.user_id = ${userId} and n.read_at is null)`,
  }).from(submissions).leftJoin(hostReplies, eq(hostReplies.submissionId, submissions.id)).where(eq(submissions.userId, userId)).orderBy(desc(submissions.createdAt));
}

export async function deleteOwnUnreadSubmission(userId: string, submissionId: string) {
  const result = await getDb().update(submissions).set({ deletedAt: new Date(), deletedBy: userId, updatedAt: new Date() })
    .where(and(eq(submissions.id, submissionId), eq(submissions.userId, userId), isNull(submissions.hostReadAt), isNull(submissions.deletedAt))).returning({ id: submissions.id });
  return result.length === 1;
}

export async function getNotifications(userId: string, unreadOnly = false) {
  const condition = unreadOnly ? and(eq(notifications.userId, userId), isNull(notifications.readAt)) : eq(notifications.userId, userId);
  return getDb().select({ id: notifications.id, type: notifications.type, submissionId: notifications.submissionId, readAt: notifications.readAt, createdAt: notifications.createdAt, title: submissions.title })
    .from(notifications).leftJoin(submissions, eq(notifications.submissionId, submissions.id)).where(condition).orderBy(desc(notifications.createdAt));
}

export async function unreadNotificationCount(userId: string) {
  const [row] = await getDb().select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return getDb().update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}
export async function markAllNotificationsRead(userId: string) { return getDb().update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))); }

export async function getHostStats() {
  const [newRows, pendingRows, progressRows, completedRows, pinnedRows, unreadRows] = await Promise.all([
    getDb().select({ value: count() }).from(submissions).where(and(eq(submissions.source, "user"), isNull(submissions.hostReadAt), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(submissions).where(and(eq(submissions.contentStatus, "pending"), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(submissions).where(and(eq(submissions.contentStatus, "in_progress"), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(submissions).where(and(eq(submissions.contentStatus, "completed"), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(submissions).where(and(isNotNull(submissions.pinnedAt), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(notifications).where(isNull(notifications.readAt)),
  ]);
  return [newRows[0].value, pendingRows[0].value, progressRows[0].value, completedRows[0].value, pinnedRows[0].value, unreadRows[0].value];
}

export async function getHostSubmissions(filters: { id?:string; view?: "inbox" | "library"; read?: string; category?: string; status?: string; q?: string; pinned?: boolean } = {}) {
  const conditions = filters.view === "library" ? [isNotNull(submissions.publishedAt)] : [];
  if (filters.view === "inbox") conditions.push(eq(submissions.source, "user"));
  if (filters.id) conditions.push(eq(submissions.id, filters.id));
  if (filters.read === "unread") conditions.push(isNull(submissions.hostReadAt));
  if (filters.read === "read") conditions.push(isNotNull(submissions.hostReadAt));
  if (filters.category) conditions.push(eq(submissions.category, filters.category as Category));
  if (filters.status) conditions.push(eq(submissions.contentStatus, filters.status as ContentStatus));
  if (filters.q) conditions.push(ilike(submissions.normalizedTitle, `%${normalizeTitle(filters.q)}%`));
  if (filters.pinned) conditions.push(isNotNull(submissions.pinnedAt));
  return getDb().select({
    id: submissions.id, title: submissions.title, category: submissions.category, description: submissions.description,
    externalUrl: submissions.externalUrl, username: users.username, anonymousPublic: submissions.anonymousPublic,
    hostReadAt: submissions.hostReadAt, publishedAt: submissions.publishedAt, contentStatus: submissions.contentStatus,
    source: submissions.source, score: submissions.score,
    pinnedAt: submissions.pinnedAt, pinNote: submissions.pinNote, deletedAt: submissions.deletedAt, createdAt: submissions.createdAt,
    reply: hostReplies.content,
  }).from(submissions).innerJoin(users, eq(submissions.userId, users.id)).leftJoin(hostReplies, eq(hostReplies.submissionId, submissions.id))
    .where(conditions.length ? and(...conditions) : undefined).orderBy(desc(submissions.createdAt)).limit(200);
}
export async function getHostSubmission(id:string){return (await getHostSubmissions({id}))[0]??null;}

export async function markReadAndPublish(hostId: string, submissionId: string) {
  return getDb().transaction(async (tx) => {
    const [current] = await tx.select().from(submissions).where(and(eq(submissions.id, submissionId), isNull(submissions.deletedAt))).limit(1);
    if (!current) throw new Error("投稿不存在");
    const patch=firstOpenPatch(current.hostReadAt,new Date());
    if (patch) {
      await tx.update(submissions).set(patch).where(and(eq(submissions.id, submissionId), isNull(submissions.hostReadAt)));
      await tx.insert(activityLogs).values({ actorUserId: hostId, submissionId, action: "submission_published" });
    }
    return current;
  });
}

export async function softDelete(hostId: string, submissionId: string) {
  await getDb().transaction(async (tx) => {
    await tx.update(submissions).set({ deletedAt: new Date(), deletedBy: hostId, pinnedAt: null, pinnedBy: null, updatedAt: new Date() }).where(eq(submissions.id, submissionId));
    await tx.insert(activityLogs).values({ actorUserId: hostId, submissionId, action: "submission_deleted" });
  });
}
export async function restoreSubmission(hostId: string, submissionId: string) { await getDb().update(submissions).set({ deletedAt: null, deletedBy: null, updatedAt: new Date() }).where(eq(submissions.id, submissionId)); await getDb().insert(activityLogs).values({ actorUserId: hostId, submissionId, action: "submission_restored" }); }

export async function updateContentStatus(hostId: string, submissionId: string, status: ContentStatus) {
  await getDb().update(submissions).set({ contentStatus: status, contentCompletedAt: status === "completed" ? new Date() : null, score: status === "completed" ? undefined : null, updatedAt: new Date() }).where(and(eq(submissions.id, submissionId), isNull(submissions.deletedAt)));
  await getDb().insert(activityLogs).values({ actorUserId: hostId, submissionId, action: "content_status_updated", metadata: { status } });
}

export async function updateScore(hostId: string, submissionId: string, score: number | null) {
  await getDb().transaction(async (tx) => {
    const [current] = await tx.select({ status: submissions.contentStatus }).from(submissions).where(and(eq(submissions.id, submissionId), isNull(submissions.deletedAt))).limit(1);
    if (!current) throw new Error("投稿不存在");
    if (score !== null && current.status !== "completed") throw new Error("只有已完成的作品才能评分");
    await tx.update(submissions).set({ score, updatedAt: new Date() }).where(eq(submissions.id, submissionId));
    await tx.insert(activityLogs).values({ actorUserId: hostId, submissionId, action: "submission_scored", metadata: { score } });
  });
}

export async function setPinned(hostId: string, submissionId: string, pin: boolean, pinNote?: string) {
  await getDb().transaction(async (tx) => {
    if (pin) {
      const [total] = await tx.select({ value: count() }).from(submissions).where(and(isNotNull(submissions.pinnedAt), isNull(submissions.deletedAt)));
      const [current] = await tx.select({ pinnedAt: submissions.pinnedAt, publishedAt: submissions.publishedAt }).from(submissions).where(eq(submissions.id, submissionId)).limit(1);
      if (!current?.publishedAt) throw new Error("只能置顶已公开投稿");
      if (!current.pinnedAt && total.value >= MAX_PINNED_SUBMISSIONS) throw new Error(`最多置顶 ${MAX_PINNED_SUBMISSIONS} 条`);
      await tx.update(submissions).set({ pinnedAt: new Date(), pinnedBy: hostId, pinNote: pinNote || null, updatedAt: new Date() }).where(eq(submissions.id, submissionId));
    } else await tx.update(submissions).set({ pinnedAt: null, pinnedBy: null, pinNote: null, updatedAt: new Date() }).where(eq(submissions.id, submissionId));
    await tx.insert(activityLogs).values({ actorUserId: hostId, submissionId, action: pin ? "submission_pinned" : "submission_unpinned" });
  });
}

export async function saveHostReply(hostId: string, submissionId: string, content: string, republish = false, notifyAgain = false) {
  await getDb().transaction(async (tx) => {
    const [submission] = await tx.select({ userId: submissions.userId, source: submissions.source }).from(submissions).where(and(eq(submissions.id, submissionId), isNull(submissions.deletedAt))).limit(1);
    if (!submission) throw new Error("投稿不存在");
    const [existing] = await tx.select().from(hostReplies).where(eq(hostReplies.submissionId, submissionId)).limit(1);
    const now = new Date();
    const effects=replyEffects(!!existing,republish,notifyAgain,now);
    let replyId: string;
    if (existing) {
      replyId = existing.id;
      await tx.update(hostReplies).set({ content, updatedAt: now }).where(eq(hostReplies.id, existing.id));
    } else {
      const [reply] = await tx.insert(hostReplies).values({ submissionId, hostUserId: hostId, content, publishedAt: now }).returning({ id: hostReplies.id });
      replyId = reply.id;
      await tx.update(submissions).set({ contentStatus: "completed", contentCompletedAt: now, feedActivityAt: effects.feedActivityAt, updatedAt: now }).where(eq(submissions.id, submissionId));
      if (submission.source === "user") await tx.insert(notifications).values({ userId: submission.userId, type: "host_reply", submissionId, replyId });
    }
    if (existing && effects.feedActivityAt) {
      await tx.update(submissions).set({ feedActivityAt: effects.feedActivityAt, updatedAt: now }).where(eq(submissions.id, submissionId));
      if (effects.notificationType && submission.source === "user") await tx.insert(notifications).values({ userId: submission.userId, type: effects.notificationType, submissionId, replyId });
    }
    await tx.insert(activityLogs).values({ actorUserId: hostId, submissionId, action: existing ? "host_reply_updated" : "host_reply_published", metadata: { republish, notifyAgain } });
  });
}

export async function getPendingBilibiliUsers() {
  return getDb().select({
    id: users.id, username: users.username, bilibiliUid: users.bilibiliUid,
    verificationCode: users.bilibiliVerificationCode, createdAt: users.createdAt,
  }).from(users).where(eq(users.status, "pending")).orderBy(desc(users.createdAt)).limit(200);
}

export async function approveBilibiliUser(hostId: string, userId: string) {
  const approved = await getDb().update(users).set({ status: "active", bilibiliVerifiedAt: new Date(), bilibiliVerificationCode: null, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.status, "pending"), isNotNull(users.bilibiliUid))).returning({ id: users.id });
  if (!approved.length) throw new Error("待验证用户不存在或已经处理");
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "bilibili_user_approved", metadata: { userId } });
}

type SettingsInput = { siteName:string; siteTagline:string; backgroundType:"built_in"|"custom"; backgroundImageUrl:string|null; primaryColor:string; secondaryColor:string; accentColor:string; backgroundColor:string; cardOpacity:string; backgroundOverlay:string };
export async function updateSettings(hostId: string, value: SettingsInput) {
  await getDb().insert(siteSettings).values({ id: "default", ...value, updatedBy: hostId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.id, set: { ...value, updatedBy: hostId, updatedAt: new Date() } });
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "site_theme_updated" });
}
