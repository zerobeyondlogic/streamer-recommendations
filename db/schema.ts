import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull(),
  usernameNormalized: text("username_normalized").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["user", "host"] }).notNull().default("user"),
  status: text("status", { enum: ["pending", "active", "banned"] }).notNull().default("pending"),
  bilibiliUid: text("bilibili_uid"),
  bilibiliVerificationCode: text("bilibili_verification_code"),
  bilibiliVerifiedAt: timestamp("bilibili_verified_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("users_username_normalized_uidx").on(table.usernameNormalized),
  uniqueIndex("users_bilibili_uid_uidx").on(table.bilibiliUid).where(sql`${table.bilibiliUid} is not null`),
  check("users_role_check", sql`${table.role} in ('user', 'host')`),
  check("users_status_check", sql`${table.status} in ('pending', 'active', 'banned')`),
  check("users_bilibili_uid_check", sql`${table.bilibiliUid} is null or ${table.bilibiliUid} ~ '^[1-9][0-9]{0,19}$'`),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  createdAt: createdAt(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex("sessions_token_hash_uidx").on(table.tokenHash),
  index("sessions_user_expiry_idx").on(table.userId, table.expiresAt),
]);

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  source: text("source", { enum: ["user", "host"] }).notNull().default("user"),
  category: text("category", { enum: ["book", "manga", "movie", "anime", "game", "other", "food", "wish"] }).notNull(),
  title: text("title").notNull(),
  normalizedTitle: text("normalized_title").notNull(),
  description: text("description"),
  externalUrl: text("external_url"),
  anonymousPublic: boolean("anonymous_public").notNull().default(false),
  hostReadAt: timestamp("host_read_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  feedActivityAt: timestamp("feed_activity_at", { withTimezone: true }),
  contentStatus: text("content_status", { enum: ["pending", "in_progress", "completed", "dropped"] }).notNull().default("pending"),
  contentCompletedAt: timestamp("content_completed_at", { withTimezone: true }),
  score: integer("score"),
  pinnedAt: timestamp("pinned_at", { withTimezone: true }),
  pinnedBy: uuid("pinned_by").references(() => users.id, { onDelete: "set null" }),
  pinNote: text("pin_note"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  check("submissions_category_check", sql`${table.category} in ('book','manga','movie','anime','game','other','food','wish')`),
  check("submissions_status_check", sql`${table.contentStatus} in ('pending','in_progress','completed','dropped')`),
  check("submissions_source_check", sql`${table.source} in ('user','host')`),
  check("submissions_score_check", sql`${table.score} is null or (${table.score} between 1 and 10 and ${table.contentStatus} = 'completed')`),
  check("submissions_title_length_check", sql`char_length(${table.title}) between 1 and 100`),
  check("submissions_description_length_check", sql`${table.description} is null or char_length(${table.description}) <= 1000`),
  index("submissions_public_feed_idx").on(table.pinnedAt, table.feedActivityAt).where(sql`${table.publishedAt} is not null and ${table.deletedAt} is null`),
  index("submissions_user_idx").on(table.userId, table.createdAt),
  index("submissions_inbox_idx").on(table.hostReadAt, table.createdAt).where(sql`${table.deletedAt} is null`),
  index("submissions_library_idx").on(table.contentStatus, table.category, table.feedActivityAt).where(sql`${table.deletedAt} is null`),
  index("submissions_score_idx").on(table.pinnedAt, table.score, table.feedActivityAt).where(sql`${table.publishedAt} is not null and ${table.deletedAt} is null`),
]);

export const marshmallows = pgTable("marshmallows", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  content: text("content").notNull(),
  allowPublic: boolean("allow_public").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  readBy: uuid("read_by").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  check("marshmallows_content_length_check", sql`char_length(${table.content}) between 1 and 1000`),
  index("marshmallows_public_feed_idx").on(table.publishedAt).where(sql`${table.publishedAt} is not null and ${table.deletedAt} is null`),
  index("marshmallows_pending_idx").on(table.createdAt).where(sql`${table.readAt} is null and ${table.deletedAt} is null`),
  index("marshmallows_user_created_idx").on(table.userId, table.createdAt),
]);

export const submissionReviews = pgTable("submission_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recommend: boolean("recommend").notNull(),
  comment: text("comment"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("submission_reviews_submission_user_uidx").on(table.submissionId, table.userId),
  index("submission_reviews_submission_updated_idx").on(table.submissionId, table.updatedAt),
  check("submission_reviews_comment_length_check", sql`${table.comment} is null or char_length(${table.comment}) between 1 and 2000`),
]);

export const hostReplies = pgTable("host_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("host_replies_submission_uidx").on(table.submissionId),
  check("host_replies_content_length_check", sql`char_length(${table.content}) between 1 and 4000`),
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["host_reply", "host_reply_updated", "submission_pinned"] }).notNull(),
  submissionId: uuid("submission_id").references(() => submissions.id, { onDelete: "cascade" }),
  replyId: uuid("reply_id").references(() => hostReplies.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [
  check("notifications_type_check", sql`${table.type} in ('host_reply','host_reply_updated','submission_pinned')`),
  index("notifications_user_unread_idx").on(table.userId, table.createdAt).where(sql`${table.readAt} is null`),
]);

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("default"),
  siteName: text("site_name").notNull().default("神绮爱的宝箱"),
  siteTagline: text("site_tagline").notNull().default("书籍、漫画、电影、动漫和游戏都可以投稿。"),
  backgroundType: text("background_type", { enum: ["built_in", "custom"] }).notNull().default("built_in"),
  backgroundImageUrl: text("background_image_url"),
  primaryColor: text("primary_color").notNull().default("#7259d9"),
  secondaryColor: text("secondary_color").notNull().default("#ff9f76"),
  accentColor: text("accent_color").notNull().default("#f4c95d"),
  backgroundColor: text("background_color").notNull().default("#fff9f2"),
  cardOpacity: numeric("card_opacity", { precision: 3, scale: 2 }).notNull().default("0.94"),
  backgroundOverlay: numeric("background_overlay", { precision: 3, scale: 2 }).notNull().default("0.30"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
}, (table) => [
  check("site_settings_background_type_check", sql`${table.backgroundType} in ('built_in','custom')`),
  check("site_settings_card_opacity_check", sql`${table.cardOpacity} between 0.70 and 1.00`),
  check("site_settings_overlay_check", sql`${table.backgroundOverlay} between 0.00 and 0.85`),
]);

export const siteCopySettings = pgTable("site_copy_settings", {
  id: text("id").primaryKey().default("default"),
  recommendationHeroTitle: text("recommendation_hero_title").notNull().default("把喜欢的作品，"),
  recommendationHeroAccent: text("recommendation_hero_accent").notNull().default("推荐给神绮爱。"),
  recommendationSectionTitle: text("recommendation_section_title").notNull().default("最近的作品推荐"),
  foodHeroTitle: text("food_hero_title").notNull().default("好吃的，当然要一起分享。"),
  foodTagline: text("food_tagline").notNull().default("推荐值得一吃的店铺、菜品和味道。"),
  foodSectionTitle: text("food_section_title").notNull().default("大家的美食推荐"),
  wishHeroTitle: text("wish_hero_title").notNull().default("下一次直播，想和神绮爱做什么？"),
  wishTagline: text("wish_tagline").notNull().default("许愿台词回读、一起看作品，或任何直播企划。"),
  wishSectionTitle: text("wish_section_title").notNull().default("等待实现的愿望"),
  marshmallowHeroTitle: text("marshmallow_hero_title").notNull().default("给神绮爱一颗棉花糖"),
  marshmallowTagline: text("marshmallow_tagline").notNull().default("写下想说的话，默认仅神绮爱可见。"),
  marshmallowSectionTitle: text("marshmallow_section_title").notNull().default("已上墙的棉花糖"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  submissionId: uuid("submission_id").references(() => submissions.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}, (table) => [index("activity_logs_actor_created_idx").on(table.actorUserId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Marshmallow = typeof marshmallows.$inferSelect;
export type SubmissionReview = typeof submissionReviews.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type SiteCopySetting = typeof siteCopySettings.$inferSelect;
