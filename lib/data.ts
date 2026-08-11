import "server-only";
import { and, asc, count, desc, eq, gt, ilike, isNotNull, isNull, lt, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { activityLogs, hostMusingLikes, hostMusings, hostReplies, marshmallowLikes, marshmallows, notifications, sessions, siteCopySettings, siteSettings, submissionReviews, submissions, users } from "@/db/schema";
import { MAX_PINNED_SUBMISSIONS, submissionKind, type Category, type ContentStatus, type FeedSort, type SubmissionKind } from "./config";
import { normalizeTitle, publicSubmitter, safePageNumber } from "./security";
import { firstOpenPatch, marshmallowReadPatch, replyEffects, shouldNotifySubmissionAuthor } from "./transitions";

export const defaultSettings = {
  id: "default", siteName: "神绮爱的宝箱", siteTagline: "书籍、漫画、电影、动漫和游戏都可以投稿。",
  siteIconUrl: null, customFontUrl: null, recommendationHeroImageUrl: null, backgroundType: "built_in" as const, backgroundImageUrl: null, backgroundImageMobileUrl: null, primaryColor: "#7259d9", secondaryColor: "#ff9f76",
  accentColor: "#f4c95d", backgroundColor: "#fff9f2", navOpacity: "0.94", heroOpacity: "0.94", filterOpacity: "0.72", cardOpacity: "0.94",
  navBlur: false, heroBlur: false, filterBlur: false, cardBlur: false, ambientTextMist: "0.55", backgroundOverlay: "0.30", updatedBy: null, updatedAt: new Date(0),
};

export const defaultSiteCopy = {
  id: "default", recommendationHeroTitle: "把喜欢的作品，", recommendationHeroAccent: "推荐给神绮爱。", recommendationTagline: "书籍、漫画、电影、动漫和游戏都可以投稿。", recommendationSectionTitle: "最近的作品推荐",
  foodHeroTitle: "好吃的，当然要一起分享。", foodTagline: "推荐值得一吃的店铺、菜品和味道。", foodSectionTitle: "大家的美食推荐",
  wishHeroTitle: "下一次直播，想和神绮爱做什么？", wishTagline: "许愿台词回读、一起看作品，或任何直播企划。", wishSectionTitle: "等待实现的愿望",
  marshmallowHeroTitle: "给神绮爱一颗棉花糖", marshmallowTagline: "写下想说的话，默认仅神绮爱可见。", marshmallowSectionTitle: "已上墙的棉花糖",
  musingsHeroTitle: "碎碎念", musingsTagline: "一些近况、随想，和想说的话。", musingsSectionTitle: "最近在想",
  updatedBy: null, updatedAt: new Date(0),
};

export const getSettings = cache(async function getSettings() {
  try { const [value] = await getDb().select().from(siteSettings).where(eq(siteSettings.id, "default")).limit(1); return value ?? defaultSettings; }
  catch (error) {
    const message = String(error);
    if (message.includes("DATABASE_URL_MISSING")) return defaultSettings;
    if (message.includes("ambient_text_mist")) {
      const legacyFields = {
        id: siteSettings.id, siteName: siteSettings.siteName, siteTagline: siteSettings.siteTagline, siteIconUrl: siteSettings.siteIconUrl,
        customFontUrl: siteSettings.customFontUrl, recommendationHeroImageUrl: siteSettings.recommendationHeroImageUrl, backgroundType: siteSettings.backgroundType,
        backgroundImageUrl: siteSettings.backgroundImageUrl, backgroundImageMobileUrl: siteSettings.backgroundImageMobileUrl, primaryColor: siteSettings.primaryColor,
        secondaryColor: siteSettings.secondaryColor, accentColor: siteSettings.accentColor, backgroundColor: siteSettings.backgroundColor,
        navOpacity: siteSettings.navOpacity, heroOpacity: siteSettings.heroOpacity, filterOpacity: siteSettings.filterOpacity, cardOpacity: siteSettings.cardOpacity,
        navBlur: siteSettings.navBlur, heroBlur: siteSettings.heroBlur, filterBlur: siteSettings.filterBlur, cardBlur: siteSettings.cardBlur,
        backgroundOverlay: siteSettings.backgroundOverlay, updatedBy: siteSettings.updatedBy, updatedAt: siteSettings.updatedAt,
      };
      const [legacy] = await getDb().select(legacyFields).from(siteSettings).where(eq(siteSettings.id, "default")).limit(1);
      return legacy ? { ...legacy, ambientTextMist: defaultSettings.ambientTextMist } : defaultSettings;
    }
    throw error;
  }
});

export const getSiteCopy = cache(async function getSiteCopy() {
  try { const [value] = await getDb().select().from(siteCopySettings).where(eq(siteCopySettings.id, "default")).limit(1); return value ?? defaultSiteCopy; }
  catch (error) {
    const message = String(error);
    if (message.includes("DATABASE_URL_MISSING")) return defaultSiteCopy;
    if (message.includes("musings_hero_title")) {
      const legacyFields = {
        id: siteCopySettings.id,
        recommendationHeroTitle: siteCopySettings.recommendationHeroTitle, recommendationHeroAccent: siteCopySettings.recommendationHeroAccent,
        recommendationTagline: siteCopySettings.recommendationTagline, recommendationSectionTitle: siteCopySettings.recommendationSectionTitle,
        foodHeroTitle: siteCopySettings.foodHeroTitle, foodTagline: siteCopySettings.foodTagline, foodSectionTitle: siteCopySettings.foodSectionTitle,
        wishHeroTitle: siteCopySettings.wishHeroTitle, wishTagline: siteCopySettings.wishTagline, wishSectionTitle: siteCopySettings.wishSectionTitle,
        marshmallowHeroTitle: siteCopySettings.marshmallowHeroTitle, marshmallowTagline: siteCopySettings.marshmallowTagline, marshmallowSectionTitle: siteCopySettings.marshmallowSectionTitle,
        updatedBy: siteCopySettings.updatedBy, updatedAt: siteCopySettings.updatedAt,
      };
      const [legacy] = await getDb().select(legacyFields).from(siteCopySettings).where(eq(siteCopySettings.id, "default")).limit(1);
      return legacy ? { ...legacy, musingsHeroTitle: defaultSiteCopy.musingsHeroTitle, musingsTagline: defaultSiteCopy.musingsTagline, musingsSectionTitle: defaultSiteCopy.musingsSectionTitle } : defaultSiteCopy;
    }
    if (message.includes("site_copy_settings")) return defaultSiteCopy;
    throw error;
  }
});

export async function getPublicFeed(filters: { kind?: SubmissionKind; category?: string; status?: string; q?: string; hostRecommended?: boolean; sort?: FeedSort; page?: number; currentUserId?: string } = {}) {
  try {
    const communityScore = sql<number>`coalesce((select sum(case when ${submissionReviews.recommend} = true then 1 when ${submissionReviews.recommend} = false then -1 else 0 end) from ${submissionReviews} where ${submissionReviews.submissionId} = ${submissions.id}), 0)::int`;
    const recommendCount = sql<number>`(select count(*)::int from ${submissionReviews} where ${submissionReviews.submissionId} = ${submissions.id} and ${submissionReviews.recommend} = true)`;
    const notRecommendCount = sql<number>`(select count(*)::int from ${submissionReviews} where ${submissionReviews.submissionId} = ${submissions.id} and ${submissionReviews.recommend} = false)`;
    const currentUserRecommend = filters.currentUserId
      ? sql<boolean | null>`(select ${submissionReviews.recommend} from ${submissionReviews} where ${submissionReviews.submissionId} = ${submissions.id} and ${submissionReviews.userId} = ${filters.currentUserId} limit 1)`
      : sql<boolean | null>`null`;
    const conditions = [isNotNull(submissions.publishedAt), isNull(submissions.deletedAt)];
    if (filters.kind === "work") conditions.push(notInArray(submissions.category, ["food", "wish"]));
    if (filters.kind === "food") conditions.push(eq(submissions.category, "food"));
    if (filters.kind === "wish") conditions.push(eq(submissions.category, "wish"));
    if (filters.category) conditions.push(eq(submissions.category, filters.category as Category));
    if (filters.status) conditions.push(eq(submissions.contentStatus, filters.status as ContentStatus));
    if (filters.q) conditions.push(ilike(submissions.normalizedTitle, `%${normalizeTitle(filters.q)}%`));
    if (filters.hostRecommended) {
      const hostRecommended = or(eq(submissions.source, "host"), isNotNull(submissions.pinnedAt));
      if (hostRecommended) conditions.push(hostRecommended);
    }
    const page = safePageNumber(filters.page);
    const rows = await getDb().select({
      id: submissions.id, category: submissions.category, title: submissions.title, description: submissions.description,
      externalUrl: submissions.externalUrl, anonymousPublic: submissions.anonymousPublic, username: users.username,
      createdAt: submissions.createdAt, publishedAt: submissions.publishedAt, feedActivityAt: submissions.feedActivityAt,
      contentStatus: submissions.contentStatus, pinnedAt: submissions.pinnedAt, pinNote: submissions.pinNote,
      source: submissions.source, score: submissions.score,
      communityScore, recommendCount, notRecommendCount, currentUserRecommend,
      reply: hostReplies.content, replyPublishedAt: hostReplies.publishedAt,
    }).from(submissions).innerJoin(users, eq(submissions.userId, users.id)).leftJoin(hostReplies, eq(hostReplies.submissionId, submissions.id))
      .where(and(...conditions))
      .orderBy(
        desc(sql`${submissions.pinnedAt} is not null`),
        desc(submissions.pinnedAt),
        ...(filters.kind === "wish" ? [sql`case when ${submissions.contentStatus} = 'completed' then 1 else 0 end asc`] : []),
        ...(filters.sort === "score" ? [sql`${submissions.score} desc nulls last`, desc(submissions.feedActivityAt)] : filters.sort === "community" ? [desc(communityScore), desc(submissions.feedActivityAt)] : [desc(submissions.feedActivityAt)]),
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

export async function getPublicSubmissionDetail(submissionId: string, currentUserId?: string, requestedReviewPage = 1) {
  const communityScore = sql<number>`coalesce((select sum(case when ${submissionReviews.recommend} = true then 1 when ${submissionReviews.recommend} = false then -1 else 0 end) from ${submissionReviews} where ${submissionReviews.submissionId} = ${submissions.id}), 0)::int`;
  const recommendCount = sql<number>`(select count(*)::int from ${submissionReviews} where ${submissionReviews.submissionId} = ${submissions.id} and ${submissionReviews.recommend} = true)`;
  const notRecommendCount = sql<number>`(select count(*)::int from ${submissionReviews} where ${submissionReviews.submissionId} = ${submissions.id} and ${submissionReviews.recommend} = false)`;
  const commentCount = sql<number>`(select count(*)::int from ${submissionReviews} where ${submissionReviews.submissionId} = ${submissions.id} and ${submissionReviews.comment} is not null)`;
  const [item] = await getDb().select({
    id: submissions.id, userId: submissions.userId, category: submissions.category, title: submissions.title, description: submissions.description,
    externalUrl: submissions.externalUrl, anonymousPublic: submissions.anonymousPublic, username: users.username,
    createdAt: submissions.createdAt, publishedAt: submissions.publishedAt, feedActivityAt: submissions.feedActivityAt,
    contentStatus: submissions.contentStatus, pinnedAt: submissions.pinnedAt, pinNote: submissions.pinNote,
    source: submissions.source, score: submissions.score, communityScore, recommendCount, notRecommendCount, commentCount,
    reply: hostReplies.content, replyPublishedAt: hostReplies.publishedAt,
  }).from(submissions).innerJoin(users, eq(submissions.userId, users.id)).leftJoin(hostReplies, eq(hostReplies.submissionId, submissions.id))
    .where(and(eq(submissions.id, submissionId), isNotNull(submissions.publishedAt), isNull(submissions.deletedAt))).limit(1);
  if (!item) return null;
  const reviewPage = safePageNumber(requestedReviewPage);
  const reviewConditions = [eq(submissionReviews.submissionId, submissionId), isNotNull(submissionReviews.comment)];
  if (currentUserId) reviewConditions.push(ne(submissionReviews.userId, currentUserId));
  const [reviews, own] = await Promise.all([
    getDb().select({ id: submissionReviews.id, recommend: submissionReviews.recommend, comment: submissionReviews.comment, createdAt: submissionReviews.createdAt, updatedAt: submissionReviews.updatedAt, username: users.username })
      .from(submissionReviews).innerJoin(users, eq(submissionReviews.userId, users.id))
      .where(and(...reviewConditions))
      .orderBy(desc(submissionReviews.updatedAt)).limit(51).offset((reviewPage - 1) * 50),
    currentUserId ? getDb().select({ recommend: submissionReviews.recommend, comment: submissionReviews.comment, updatedAt: submissionReviews.updatedAt })
      .from(submissionReviews).where(and(eq(submissionReviews.submissionId, submissionId), eq(submissionReviews.userId, currentUserId))).limit(1) : Promise.resolve([]),
  ]);
  const { anonymousPublic, username, userId, ...publicItem } = item;
  return { item: { ...publicItem, submitter: publicSubmitter(anonymousPublic, username) }, isAuthor: currentUserId === userId, reviews: reviews.slice(0, 50), reviewPage, reviewHasMore: reviews.length > 50, ownReview: own[0] ?? null };
}

async function assertPublishedSubmission(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], submissionId: string) {
  const [submission] = await tx.select({ id: submissions.id }).from(submissions)
    .where(and(eq(submissions.id, submissionId), isNotNull(submissions.publishedAt), isNull(submissions.deletedAt))).limit(1);
  if (!submission) throw new Error("这条内容不存在或尚未公开");
}

export async function setSubmissionVote(userId: string, submissionId: string, recommend: boolean | null) {
  return getDb().transaction(async (tx) => {
    await assertPublishedSubmission(tx, submissionId);
    const [existing] = await tx.select({ comment: submissionReviews.comment, recommend: submissionReviews.recommend }).from(submissionReviews)
      .where(and(eq(submissionReviews.submissionId, submissionId), eq(submissionReviews.userId, userId))).limit(1);
    const now = new Date();
    if (recommend === null && !existing?.comment) {
      if (existing) await tx.delete(submissionReviews).where(and(eq(submissionReviews.submissionId, submissionId), eq(submissionReviews.userId, userId)));
    } else {
      await tx.insert(submissionReviews).values({ userId, submissionId, recommend, comment: existing?.comment ?? null, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: [submissionReviews.submissionId, submissionReviews.userId], set: { recommend, updatedAt: now } });
    }
    await tx.insert(activityLogs).values({ actorUserId: userId, submissionId, action: "submission_vote_updated", metadata: { recommend } });
  });
}

export async function toggleSubmissionLike(userId: string, submissionId: string) {
  return getDb().transaction(async (tx) => {
    await assertPublishedSubmission(tx, submissionId);
    const [existing] = await tx.select({ comment: submissionReviews.comment, recommend: submissionReviews.recommend }).from(submissionReviews)
      .where(and(eq(submissionReviews.submissionId, submissionId), eq(submissionReviews.userId, userId))).limit(1);
    const liked = existing?.recommend !== true;
    const now = new Date();
    if (!liked && !existing?.comment) {
      await tx.delete(submissionReviews).where(and(eq(submissionReviews.submissionId, submissionId), eq(submissionReviews.userId, userId)));
    } else {
      await tx.insert(submissionReviews).values({ userId, submissionId, recommend: liked ? true : null, comment: existing?.comment ?? null, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: [submissionReviews.submissionId, submissionReviews.userId], set: { recommend: liked ? true : null, updatedAt: now } });
    }
    await tx.insert(activityLogs).values({ actorUserId: userId, submissionId, action: liked ? "submission_liked" : "submission_unliked" });
    return liked;
  });
}

export async function saveSubmissionComment(userId: string, submissionId: string, comment: string) {
  return getDb().transaction(async (tx) => {
    await assertPublishedSubmission(tx, submissionId);
    const now = new Date();
    await tx.insert(submissionReviews).values({ userId, submissionId, recommend: null, comment, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: [submissionReviews.submissionId, submissionReviews.userId], set: { comment, updatedAt: now } });
    await tx.insert(activityLogs).values({ actorUserId: userId, submissionId, action: "submission_comment_saved" });
  });
}

export async function deleteSubmissionComment(userId: string, submissionId: string) {
  await getDb().transaction(async (tx) => {
    const [existing] = await tx.select({ recommend: submissionReviews.recommend, comment: submissionReviews.comment }).from(submissionReviews)
      .where(and(eq(submissionReviews.submissionId, submissionId), eq(submissionReviews.userId, userId))).limit(1);
    if (!existing?.comment) throw new Error("没有可以删除的评论");
    if (existing.recommend === null) {
      await tx.delete(submissionReviews).where(and(eq(submissionReviews.submissionId, submissionId), eq(submissionReviews.userId, userId)));
    } else {
      await tx.update(submissionReviews).set({ comment: null, updatedAt: new Date() })
        .where(and(eq(submissionReviews.submissionId, submissionId), eq(submissionReviews.userId, userId)));
    }
    await tx.insert(activityLogs).values({ actorUserId: userId, submissionId, action: "submission_comment_deleted" });
  });
}

export async function createMarshmallow(userId: string, data: { content: string; allowPublic: boolean }) {
  const [row] = await getDb().insert(marshmallows).values({ userId, ...data }).returning({ id: marshmallows.id });
  await getDb().insert(activityLogs).values({ actorUserId: userId, action: "marshmallow_created", metadata: { marshmallowId: row.id, allowPublic: data.allowPublic } });
  return row;
}

export async function getMyMarshmallows(userId: string, page = 1) {
  const safePage = safePageNumber(page);
  const rows = await getDb().select({
    id: marshmallows.id, content: marshmallows.content, allowPublic: marshmallows.allowPublic,
    readAt: marshmallows.readAt, publishedAt: marshmallows.publishedAt, deletedAt: marshmallows.deletedAt,
    createdAt: marshmallows.createdAt, updatedAt: marshmallows.updatedAt,
  }).from(marshmallows).where(eq(marshmallows.userId, userId))
    .orderBy(desc(marshmallows.createdAt), desc(marshmallows.id)).limit(51).offset((safePage - 1) * 50);
  return { items: rows.slice(0, 50), hasMore: rows.length > 50, page: safePage };
}

export async function updateOwnUnreadMarshmallow(userId: string, marshmallowId: string, data: { content: string; allowPublic: boolean }) {
  await getDb().transaction(async (tx) => {
    const rows = await tx.update(marshmallows).set({ ...data, updatedAt: new Date() })
      .where(and(eq(marshmallows.id, marshmallowId), eq(marshmallows.userId, userId), isNull(marshmallows.readAt), isNull(marshmallows.deletedAt)))
      .returning({ id: marshmallows.id });
    if (!rows.length) throw new Error("这颗棉花糖已处理，不能再修改");
    await tx.insert(activityLogs).values({ actorUserId: userId, action: "marshmallow_updated_by_author", metadata: { marshmallowId, allowPublic: data.allowPublic } });
  });
}

export async function deleteOwnUnreadMarshmallow(userId: string, marshmallowId: string) {
  await getDb().transaction(async (tx) => {
    const rows = await tx.delete(marshmallows)
      .where(and(eq(marshmallows.id, marshmallowId), eq(marshmallows.userId, userId), isNull(marshmallows.readAt), isNull(marshmallows.deletedAt)))
      .returning({ id: marshmallows.id });
    if (!rows.length) throw new Error("这颗棉花糖已处理，不能删除");
    await tx.insert(activityLogs).values({ actorUserId: userId, action: "marshmallow_deleted_by_author", metadata: { marshmallowId } });
  });
}

export async function getPublicMarshmallows(page = 1, currentUserId?: string) {
  const safePage = safePageNumber(page);
  const likeCount = sql<number>`(select count(*)::int from ${marshmallowLikes} where ${marshmallowLikes.marshmallowId} = ${marshmallows.id})`;
  const likedByCurrentUser = currentUserId
    ? sql<boolean>`exists(select 1 from ${marshmallowLikes} where ${marshmallowLikes.marshmallowId} = ${marshmallows.id} and ${marshmallowLikes.userId} = ${currentUserId})`
    : sql<boolean>`false`;
  const rows = await getDb().select({
    id: marshmallows.id, content: marshmallows.content, publishedAt: marshmallows.publishedAt, likeCount, likedByCurrentUser,
  }).from(marshmallows).where(and(isNotNull(marshmallows.publishedAt), isNull(marshmallows.deletedAt)))
    .orderBy(desc(marshmallows.publishedAt), desc(marshmallows.id)).limit(51).offset((safePage - 1) * 50);
  return { items: rows.slice(0, 50), hasMore: rows.length > 50, page: safePage };
}

export async function getPublicHostMusings(page = 1, currentUserId?: string) {
  const safePage = safePageNumber(page);
  try {
    const likeCount = sql<number>`(select count(*)::int from ${hostMusingLikes} where ${hostMusingLikes.hostMusingId} = ${hostMusings.id})`;
    const likedByCurrentUser = currentUserId
      ? sql<boolean>`exists(select 1 from ${hostMusingLikes} where ${hostMusingLikes.hostMusingId} = ${hostMusings.id} and ${hostMusingLikes.userId} = ${currentUserId})`
      : sql<boolean>`false`;
    const rows = await getDb().select({
      id: hostMusings.id,
      content: hostMusings.content,
      pinnedAt: hostMusings.pinnedAt,
      createdAt: hostMusings.createdAt,
      updatedAt: hostMusings.updatedAt,
      likeCount,
      likedByCurrentUser,
    }).from(hostMusings)
      .orderBy(
        desc(sql`${hostMusings.pinnedAt} is not null`),
        desc(hostMusings.pinnedAt),
        desc(hostMusings.createdAt),
        desc(hostMusings.id),
      )
      .limit(51).offset((safePage - 1) * 50);
    return { items: rows.slice(0, 50), hasMore: rows.length > 50 };
  } catch (error) {
    if (String(error).includes("DATABASE_URL_MISSING") || String(error).includes("host_musings")) return { items: [], hasMore: false };
    throw error;
  }
}

export async function toggleMarshmallowLike(userId: string, marshmallowId: string) {
  return getDb().transaction(async (tx) => {
    const [item] = await tx.select({ id: marshmallows.id }).from(marshmallows)
      .where(and(eq(marshmallows.id, marshmallowId), isNotNull(marshmallows.publishedAt), isNull(marshmallows.deletedAt))).limit(1);
    if (!item) throw new Error("这颗棉花糖不存在或尚未公开");
    const [existing] = await tx.select({ id: marshmallowLikes.id }).from(marshmallowLikes)
      .where(and(eq(marshmallowLikes.marshmallowId, marshmallowId), eq(marshmallowLikes.userId, userId))).limit(1);
    if (existing) await tx.delete(marshmallowLikes).where(eq(marshmallowLikes.id, existing.id));
    else await tx.insert(marshmallowLikes).values({ marshmallowId, userId });
    await tx.insert(activityLogs).values({ actorUserId: userId, action: existing ? "marshmallow_unliked" : "marshmallow_liked", metadata: { marshmallowId } });
    return !existing;
  });
}

export async function toggleHostMusingLike(userId: string, hostMusingId: string) {
  return getDb().transaction(async (tx) => {
    const [item] = await tx.select({ id: hostMusings.id }).from(hostMusings).where(eq(hostMusings.id, hostMusingId)).limit(1);
    if (!item) throw new Error("这条碎碎念不存在");
    const [existing] = await tx.select({ id: hostMusingLikes.id }).from(hostMusingLikes)
      .where(and(eq(hostMusingLikes.hostMusingId, hostMusingId), eq(hostMusingLikes.userId, userId))).limit(1);
    if (existing) await tx.delete(hostMusingLikes).where(eq(hostMusingLikes.id, existing.id));
    else await tx.insert(hostMusingLikes).values({ hostMusingId, userId });
    await tx.insert(activityLogs).values({ actorUserId: userId, action: existing ? "host_musing_unliked" : "host_musing_liked", metadata: { hostMusingId } });
    return !existing;
  });
}

export async function getHostMusings() {
  return getDb().select({
    id: hostMusings.id,
    content: hostMusings.content,
    pinnedAt: hostMusings.pinnedAt,
    createdAt: hostMusings.createdAt,
    updatedAt: hostMusings.updatedAt,
  }).from(hostMusings)
    .orderBy(
      desc(sql`${hostMusings.pinnedAt} is not null`),
      desc(hostMusings.pinnedAt),
      desc(hostMusings.createdAt),
      desc(hostMusings.id),
    )
    .limit(500);
}

export async function createHostMusing(hostId: string, content: string) {
  const [row] = await getDb().insert(hostMusings).values({ hostUserId: hostId, content }).returning({ id: hostMusings.id });
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "host_musing_created", metadata: { hostMusingId: row.id } });
  return row;
}

export async function updateHostMusing(hostId: string, hostMusingId: string, content: string) {
  const rows = await getDb().update(hostMusings).set({ content, updatedAt: new Date() })
    .where(and(eq(hostMusings.id, hostMusingId), eq(hostMusings.hostUserId, hostId)))
    .returning({ id: hostMusings.id });
  if (!rows.length) throw new Error("碎碎念不存在或无权修改");
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "host_musing_updated", metadata: { hostMusingId } });
}

export async function setHostMusingPinned(hostId: string, hostMusingId: string, pin: boolean) {
  const rows = await getDb().update(hostMusings).set({ pinnedAt: pin ? new Date() : null })
    .where(and(eq(hostMusings.id, hostMusingId), eq(hostMusings.hostUserId, hostId)))
    .returning({ id: hostMusings.id });
  if (!rows.length) throw new Error("碎碎念不存在或无权置顶");
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: pin ? "host_musing_pinned" : "host_musing_unpinned", metadata: { hostMusingId } });
}

export async function deleteHostMusing(hostId: string, hostMusingId: string) {
  const rows = await getDb().delete(hostMusings)
    .where(and(eq(hostMusings.id, hostMusingId), eq(hostMusings.hostUserId, hostId)))
    .returning({ id: hostMusings.id });
  if (!rows.length) throw new Error("碎碎念不存在或无权删除");
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "host_musing_deleted", metadata: { hostMusingId } });
}

export type MarshmallowHostStatus = "all" | "pending" | "read" | "published" | "private" | "deleted";

export async function getHostMarshmallows(status: MarshmallowHostStatus = "pending") {
  const conditions: SQL[] = [];
  if (status === "pending") conditions.push(isNull(marshmallows.readAt), isNull(marshmallows.deletedAt));
  else if (status === "read") conditions.push(isNotNull(marshmallows.readAt), isNull(marshmallows.deletedAt));
  else if (status === "published") conditions.push(isNotNull(marshmallows.publishedAt), isNull(marshmallows.deletedAt));
  else if (status === "private") conditions.push(isNotNull(marshmallows.readAt), isNull(marshmallows.publishedAt), isNull(marshmallows.deletedAt));
  else if (status === "deleted") conditions.push(isNotNull(marshmallows.deletedAt));
  else conditions.push(isNull(marshmallows.deletedAt));
  return getDb().select({
    id: marshmallows.id, content: marshmallows.content, allowPublic: marshmallows.allowPublic,
    readAt: marshmallows.readAt, publishedAt: marshmallows.publishedAt, deletedAt: marshmallows.deletedAt,
    createdAt: marshmallows.createdAt, username: users.username,
  }).from(marshmallows).innerJoin(users, eq(marshmallows.userId, users.id))
    .where(and(...conditions)).orderBy(desc(marshmallows.createdAt), desc(marshmallows.id)).limit(500);
}

export async function getMarshmallowStage(requestedId?: string) {
  const pending = [isNull(marshmallows.readAt), isNull(marshmallows.deletedAt)];
  const selection = { id: marshmallows.id, content: marshmallows.content, allowPublic: marshmallows.allowPublic, createdAt: marshmallows.createdAt, username: users.username };
  const rows = requestedId ? await getDb().select(selection).from(marshmallows).innerJoin(users, eq(marshmallows.userId, users.id))
    .where(and(eq(marshmallows.id, requestedId), ...pending)).limit(1) : [];
  const [current] = rows.length ? rows : await getDb().select(selection).from(marshmallows).innerJoin(users, eq(marshmallows.userId, users.id))
    .where(and(...pending)).orderBy(asc(marshmallows.createdAt), asc(marshmallows.id)).limit(1);
  if (!current) return null;
  const sameTimeBefore = and(eq(marshmallows.createdAt, current.createdAt), lt(marshmallows.id, current.id));
  const sameTimeAfter = and(eq(marshmallows.createdAt, current.createdAt), gt(marshmallows.id, current.id));
  const [previous] = await getDb().select({ id: marshmallows.id }).from(marshmallows)
    .where(and(...pending, or(lt(marshmallows.createdAt, current.createdAt), sameTimeBefore)))
    .orderBy(desc(marshmallows.createdAt), desc(marshmallows.id)).limit(1);
  const [next] = await getDb().select(selection).from(marshmallows).innerJoin(users, eq(marshmallows.userId, users.id))
    .where(and(...pending, or(gt(marshmallows.createdAt, current.createdAt), sameTimeAfter)))
    .orderBy(asc(marshmallows.createdAt), asc(marshmallows.id)).limit(1);
  return { current, previousId: previous?.id ?? null, nextId: next?.id ?? null, next: next ?? null };
}

export async function markMarshmallowRead(hostId: string, marshmallowId: string) {
  return getDb().transaction(async (tx) => {
    const [current] = await tx.select({ allowPublic: marshmallows.allowPublic }).from(marshmallows)
      .where(and(eq(marshmallows.id, marshmallowId), isNull(marshmallows.readAt), isNull(marshmallows.deletedAt))).limit(1);
    if (!current) throw new Error("这颗棉花糖不存在或已经处理");
    const now = new Date();
    await tx.update(marshmallows).set({ ...marshmallowReadPatch(current.allowPublic, now), readBy: hostId })
      .where(and(eq(marshmallows.id, marshmallowId), isNull(marshmallows.readAt), isNull(marshmallows.deletedAt)));
    await tx.insert(activityLogs).values({ actorUserId: hostId, action: "marshmallow_read", metadata: { marshmallowId, published: current.allowPublic } });
    return { published: current.allowPublic };
  });
}

export async function softDeleteMarshmallow(hostId: string, marshmallowId: string) {
  const now = new Date();
  const rows = await getDb().update(marshmallows).set({ deletedAt: now, deletedBy: hostId, updatedAt: now })
    .where(and(eq(marshmallows.id, marshmallowId), isNull(marshmallows.deletedAt))).returning({ id: marshmallows.id });
  if (!rows.length) throw new Error("这颗棉花糖不存在或已经移除");
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "marshmallow_deleted", metadata: { marshmallowId } });
}

export async function restoreMarshmallow(hostId: string, marshmallowId: string) {
  const rows = await getDb().update(marshmallows).set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
    .where(and(eq(marshmallows.id, marshmallowId), isNotNull(marshmallows.deletedAt))).returning({ id: marshmallows.id });
  if (!rows.length) throw new Error("这颗棉花糖不存在或已经恢复");
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "marshmallow_restored", metadata: { marshmallowId } });
}

export async function createHostRecommendation(hostId: string, data: {
  category: Category; title: string; description: string | null; externalUrl: string | null;
  score: number | null; experience: string | null; pin: boolean; pinNote: string | null;
}) {
  return getDb().transaction(async (tx) => {
    if (data.pin) {
      const [total] = await tx.select({ value: count() }).from(submissions).where(and(isNotNull(submissions.pinnedAt), isNull(submissions.deletedAt)));
      if (total.value >= MAX_PINNED_SUBMISSIONS) throw new Error(`最多置顶 ${MAX_PINNED_SUBMISSIONS} 条`);
    }
    const now = new Date();
    const isWish = data.category === "wish";
    const [row] = await tx.insert(submissions).values({
      userId: hostId, source: "host", category: data.category, title: data.title,
      normalizedTitle: normalizeTitle(data.title), description: data.description, externalUrl: data.externalUrl,
      anonymousPublic: false, hostReadAt: now, publishedAt: now, feedActivityAt: now,
      contentStatus: isWish ? "pending" : "completed", contentCompletedAt: isWish ? null : now,
      score: isWish ? null : data.score, pinnedAt: data.pin ? now : null, pinnedBy: data.pin ? hostId : null, pinNote: data.pin ? data.pinNote : null,
    }).returning({ id: submissions.id });
    if (data.experience) await tx.insert(hostReplies).values({ submissionId: row.id, hostUserId: hostId, content: data.experience, publishedAt: now });
    await tx.insert(activityLogs).values({ actorUserId: hostId, submissionId: row.id, action: "host_recommendation_created", metadata: { pinned: data.pin, score: data.score } });
    return row;
  });
}

export async function getMySubmissions(userId: string) {
  return getDb().select({
    id: submissions.id, title: submissions.title, category: submissions.category, description: submissions.description,
    externalUrl: submissions.externalUrl, source: submissions.source, createdAt: submissions.createdAt,
    hostReadAt: submissions.hostReadAt, publishedAt: submissions.publishedAt, anonymousPublic: submissions.anonymousPublic,
    contentStatus: submissions.contentStatus, score: submissions.score, reply: hostReplies.content,
    unread: sql<boolean>`exists(select 1 from ${notifications} n where n.submission_id = ${submissions.id} and n.user_id = ${userId} and n.read_at is null)`,
  }).from(submissions).leftJoin(hostReplies, eq(hostReplies.submissionId, submissions.id))
    .where(and(eq(submissions.userId, userId), isNull(submissions.deletedAt))).orderBy(desc(submissions.createdAt));
}

export async function updateAuthoredSubmission(userId: string, submissionId: string, data: {
  category: Category; title: string; description: string | null; externalUrl: string | null; anonymousPublic: boolean;
}) {
  await getDb().transaction(async (tx) => {
    const [current] = await tx.select({ category: submissions.category, source: submissions.source }).from(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.userId, userId), isNull(submissions.deletedAt))).limit(1);
    if (!current) throw new Error("这条内容不存在，或你不是作者");
    if (submissionKind(current.category) !== submissionKind(data.category)) throw new Error("不能把内容移动到另一个栏目");
    await tx.update(submissions).set({
      category: data.category,
      title: data.title,
      normalizedTitle: normalizeTitle(data.title),
      description: data.description,
      externalUrl: data.externalUrl,
      anonymousPublic: current.source === "host" ? false : data.anonymousPublic,
      updatedAt: new Date(),
    }).where(eq(submissions.id, submissionId));
    await tx.insert(activityLogs).values({ actorUserId: userId, submissionId, action: "submission_updated_by_author" });
  });
}

export async function deleteOwnUnreadSubmission(userId: string, submissionId: string) {
  return getDb().transaction(async (tx) => {
    const result = await tx.delete(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.userId, userId), isNull(submissions.hostReadAt), isNull(submissions.deletedAt)))
      .returning({ id: submissions.id });
    if (!result.length) return false;
    await tx.insert(activityLogs).values({ actorUserId: userId, action: "submission_deleted_by_author", metadata: { submissionId } });
    return true;
  });
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
  const [newRows, pendingRows, progressRows, completedRows, pinnedRows, unreadRows, marshmallowRows, hostMusingRows] = await Promise.all([
    getDb().select({ value: count() }).from(submissions).where(and(eq(submissions.source, "user"), isNull(submissions.hostReadAt), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(submissions).where(and(eq(submissions.contentStatus, "pending"), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(submissions).where(and(eq(submissions.contentStatus, "in_progress"), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(submissions).where(and(eq(submissions.contentStatus, "completed"), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(submissions).where(and(isNotNull(submissions.pinnedAt), isNull(submissions.deletedAt))),
    getDb().select({ value: count() }).from(notifications).where(isNull(notifications.readAt)),
    getDb().select({ value: count() }).from(marshmallows).where(and(isNull(marshmallows.readAt), isNull(marshmallows.deletedAt))),
    getDb().select({ value: count() }).from(hostMusings),
  ]);
  return [newRows[0].value, pendingRows[0].value, progressRows[0].value, completedRows[0].value, pinnedRows[0].value, unreadRows[0].value, marshmallowRows[0].value, hostMusingRows[0].value];
}

export async function getHostSubmissions(filters: { id?:string; view?: "inbox" | "library"; kind?: SubmissionKind; category?: string; status?: string; q?: string; pinned?: boolean } = {}) {
  const conditions = filters.view === "library" ? [isNotNull(submissions.publishedAt)] : [];
  if (filters.view === "inbox") conditions.push(eq(submissions.source, "user"), isNull(submissions.publishedAt), isNull(submissions.deletedAt));
  if (filters.kind === "work") conditions.push(notInArray(submissions.category, ["food", "wish"]));
  if (filters.kind === "food") conditions.push(eq(submissions.category, "food"));
  if (filters.kind === "wish") conditions.push(eq(submissions.category, "wish"));
  if (filters.id) conditions.push(eq(submissions.id, filters.id));
  if (filters.category) conditions.push(eq(submissions.category, filters.category as Category));
  if (filters.status) conditions.push(eq(submissions.contentStatus, filters.status as ContentStatus));
  if (filters.q) conditions.push(ilike(submissions.normalizedTitle, `%${normalizeTitle(filters.q)}%`));
  if (filters.pinned) conditions.push(isNotNull(submissions.pinnedAt));
  return getDb().select({
    id: submissions.id, userId: submissions.userId, title: submissions.title, category: submissions.category, description: submissions.description,
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
    const [submission] = await tx.select({ userId: submissions.userId, source: submissions.source, category: submissions.category }).from(submissions).where(and(eq(submissions.id, submissionId), isNull(submissions.deletedAt))).limit(1);
    if (!submission) throw new Error("投稿不存在");
    const [existing] = await tx.select().from(hostReplies).where(eq(hostReplies.submissionId, submissionId)).limit(1);
    const now = new Date();
    const effects=replyEffects(!!existing,republish,notifyAgain,now);
    const notifyAuthor = shouldNotifySubmissionAuthor(submission.source, submission.userId, hostId);
    let replyId: string;
    if (existing) {
      replyId = existing.id;
      await tx.update(hostReplies).set({ content, updatedAt: now }).where(eq(hostReplies.id, existing.id));
    } else {
      const [reply] = await tx.insert(hostReplies).values({ submissionId, hostUserId: hostId, content, publishedAt: now }).returning({ id: hostReplies.id });
      replyId = reply.id;
      await tx.update(submissions).set({
        ...(submission.category === "wish" ? {} : { contentStatus: "completed" as const, contentCompletedAt: now }),
        feedActivityAt: effects.feedActivityAt, updatedAt: now,
      }).where(eq(submissions.id, submissionId));
      if (notifyAuthor) await tx.insert(notifications).values({ userId: submission.userId, type: "host_reply", submissionId, replyId });
    }
    if (existing && effects.feedActivityAt) {
      await tx.update(submissions).set({ feedActivityAt: effects.feedActivityAt, updatedAt: now }).where(eq(submissions.id, submissionId));
      if (effects.notificationType && notifyAuthor) await tx.insert(notifications).values({ userId: submission.userId, type: effects.notificationType, submissionId, replyId });
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

export type ManagedUserStatus = "pending" | "rejected" | "active" | "banned" | "deleted";

export async function getManagedUsers(filters: { status?: ManagedUserStatus; q?: string } = {}) {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(users.status, filters.status));
  if (filters.q) conditions.push(ilike(users.usernameNormalized, `%${filters.q.trim().toLocaleLowerCase("zh-CN")}%`));
  const [totalRows, activeRows, pendingRows, rejectedRows, bannedRows, items] = await Promise.all([
    getDb().select({ value: count() }).from(users).where(ne(users.status, "deleted")),
    getDb().select({ value: count() }).from(users).where(eq(users.status, "active")),
    getDb().select({ value: count() }).from(users).where(eq(users.status, "pending")),
    getDb().select({ value: count() }).from(users).where(eq(users.status, "rejected")),
    getDb().select({ value: count() }).from(users).where(eq(users.status, "banned")),
    getDb().select({ id: users.id, username: users.username, role: users.role, status: users.status, bilibiliUid: users.bilibiliUid, verificationCode: users.bilibiliVerificationCode, rejectionMessage: users.bilibiliRejectionMessage, rejectedAt: users.bilibiliRejectedAt, createdAt: users.createdAt, deletedAt: users.deletedAt })
      .from(users).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(users.createdAt)).limit(300),
  ]);
  return { total: totalRows[0]?.value ?? 0, active: activeRows[0]?.value ?? 0, pending: pendingRows[0]?.value ?? 0, rejected: rejectedRows[0]?.value ?? 0, banned: bannedRows[0]?.value ?? 0, items };
}

export async function approveBilibiliUser(hostId: string, userId: string) {
  const approved = await getDb().update(users).set({ status: "active", bilibiliVerifiedAt: new Date(), bilibiliVerificationCode: null, bilibiliRejectionMessage: null, bilibiliRejectedAt: null, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.status, "pending"), isNotNull(users.bilibiliUid))).returning({ id: users.id });
  if (!approved.length) throw new Error("待验证用户不存在或已经处理");
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "bilibili_user_approved", metadata: { userId } });
}

export async function rejectBilibiliUser(hostId: string, userId: string, message: string) {
  const reason = message.trim();
  if (!reason || reason.length > 500) throw new Error("请填写 1～500 字的回信");
  const now = new Date();
  const rejected = await getDb().update(users).set({
    status: "rejected",
    bilibiliVerificationCode: null,
    bilibiliVerifiedAt: null,
    bilibiliRejectionMessage: reason,
    bilibiliRejectedAt: now,
    updatedAt: now,
  }).where(and(eq(users.id, userId), eq(users.status, "pending"), eq(users.role, "user"))).returning({ id: users.id });
  if (!rejected.length) throw new Error("待验证用户不存在或已经处理");
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "bilibili_user_rejected", metadata: { userId, reason } });
}

export async function setManagedUserStatus(hostId: string, userId: string, status: "active" | "banned") {
  const [target] = await getDb().select({ id: users.id, role: users.role, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target || target.status === "deleted") throw new Error("用户不存在或已经删除");
  if (target.role === "host") throw new Error("不能在这里修改主播账号");
  if (status === "active" && target.status !== "banned") throw new Error("只能重新启用已停用账号");
  if (status === "banned" && target.status !== "active") throw new Error("只能停用已启用账号");
  await getDb().transaction(async (tx) => {
    await tx.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));
    if (status === "banned") await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.insert(activityLogs).values({ actorUserId: hostId, action: status === "banned" ? "user_disabled" : "user_reactivated", metadata: { targetUserId: userId } });
  });
}

export async function deleteManagedUser(hostId: string, userId: string) {
  const [target] = await getDb().select({ id: users.id, role: users.role, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target || target.status === "deleted") throw new Error("用户不存在或已经删除");
  if (target.role === "host") throw new Error("不能删除主播账号");
  const anonymousName = `已删除用户-${userId.slice(0, 8)}`;
  await getDb().transaction(async (tx) => {
    await tx.update(users).set({
      username: anonymousName,
      usernameNormalized: anonymousName.toLocaleLowerCase("zh-CN"),
      passwordHash: `deleted$${crypto.randomUUID()}`,
      status: "deleted",
      bilibiliUid: null,
      bilibiliVerificationCode: null,
      bilibiliVerifiedAt: null,
      bilibiliRejectionMessage: null,
      bilibiliRejectedAt: null,
      deletedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.insert(activityLogs).values({ actorUserId: hostId, action: "user_deleted", metadata: { targetUserId: userId, previousStatus: target.status } });
  });
}

type ThemeSettingsInput = { backgroundType:"built_in"|"custom"; backgroundImageUrl:string|null; primaryColor:string; secondaryColor:string; accentColor:string; backgroundColor:string; backgroundOverlay:string };
export async function updateSettings(hostId: string, value: ThemeSettingsInput) {
  const backgroundPatch = value.backgroundType === "built_in" ? { backgroundImageMobileUrl: null } : {};
  await getDb().insert(siteSettings).values({ id: "default", ...value, ...backgroundPatch, updatedBy: hostId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.id, set: { ...value, ...backgroundPatch, updatedBy: hostId, updatedAt: new Date() } });
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "site_theme_updated" });
}

type AppearanceSettingsInput = { navOpacity:string; heroOpacity:string; filterOpacity:string; cardOpacity:string; navBlur:boolean; heroBlur:boolean; filterBlur:boolean; cardBlur:boolean; ambientTextMist:string };
export async function updateAppearanceSettings(hostId: string, value: AppearanceSettingsInput) {
  await getDb().insert(siteSettings).values({ id: "default", ...value, updatedBy: hostId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.id, set: { ...value, updatedBy: hostId, updatedAt: new Date() } });
  await getDb().insert(activityLogs).values({ actorUserId: hostId, action: "site_appearance_updated" });
}

type SiteCopyInput = Omit<typeof defaultSiteCopy, "id" | "updatedBy" | "updatedAt">;
export async function updateSiteCopy(hostId: string, identity: { siteName: string; siteTagline: string }, value: SiteCopyInput) {
  await getDb().transaction(async (tx) => {
    await tx.insert(siteSettings).values({ id: "default", ...identity, updatedBy: hostId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSettings.id, set: { ...identity, updatedBy: hostId, updatedAt: new Date() } });
    await tx.insert(siteCopySettings).values({ id: "default", ...value, updatedBy: hostId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteCopySettings.id, set: { ...value, updatedBy: hostId, updatedAt: new Date() } });
    await tx.insert(activityLogs).values({ actorUserId: hostId, action: "site_copy_updated" });
  });
}
