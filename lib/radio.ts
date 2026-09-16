import "server-only";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { activityLogs, radioEntries, radioEpisodes, users, type RadioEntry, type RadioEpisode } from "@/db/schema";
import { requireHost } from "./auth";
import { radioEntrySchema, radioEpisodeSchema, radioIdSchema, type RadioEntryInput, type RadioEpisodeInput } from "./radio-validation";

export type { RadioEntry, RadioEpisode } from "@/db/schema";
export type RadioEntrySummary = Pick<RadioEntry, "id" | "episodeId" | "title" | "kind" | "position">;
export class RadioError extends Error {}

const entrySummaryFields = {
  id: radioEntries.id,
  episodeId: radioEntries.episodeId,
  title: radioEntries.title,
  kind: radioEntries.kind,
  position: radioEntries.position,
};
type RadioDatabase = Pick<ReturnType<typeof getDb>, "select" | "insert" | "update" | "delete">;

function errorChain(error: unknown): Array<{ code?: string; constraint?: string; message?: string }> {
  const chain: Array<{ code?: string; constraint?: string; message?: string }> = [];
  const visited = new Set<unknown>();
  while (error && typeof error === "object" && !visited.has(error)) {
    visited.add(error);
    chain.push(error);
    error = "cause" in error ? error.cause : null;
  }
  return chain;
}

function missingRadioTables(error: unknown) {
  return errorChain(error).some((cause) => cause.code === "42P01" && /radio_(episodes|entries)/.test(cause.message ?? ""));
}

function missingDatabase(error: unknown) {
  return error instanceof Error && error.message === "DATABASE_URL_MISSING";
}

function mutationError(error: unknown): never {
  if (missingRadioTables(error)) throw new RadioError("电台尚未初始化，请联系网站维护者执行数据库迁移后重试");
  if (missingDatabase(error)) throw new RadioError("数据库尚未配置，请联系网站维护者");
  if (errorChain(error).some((cause) => cause.code === "23505" && (cause.constraint === "radio_episodes_number_uidx" || cause.message?.includes("radio_episodes_number_uidx")))) {
    throw new RadioError("这个期数已经存在，请使用其他期数");
  }
  throw error;
}

function validId(id: string) {
  if (!radioIdSchema.safeParse(id).success) throw new RadioError("内容编号无效");
  return id;
}

async function assertActiveHost(db: RadioDatabase, hostId: string, lock = false) {
  if (!radioIdSchema.safeParse(hostId).success) throw new RadioError("只有主播可以管理电台");
  const query = db.select({ id: users.id }).from(users).where(and(eq(users.id, hostId), eq(users.role, "host"), eq(users.status, "active"))).limit(1);
  const [host] = await (lock ? query.for("share") : query);
  if (!host) throw new RadioError("只有已启用的主播账号可以管理电台");
}

async function ownedEpisode(db: RadioDatabase, hostId: string, episodeId: string) {
  // All entry writes and publishing lock their parent, so a published episode cannot
  // become empty through concurrent deletes or a publish racing the last deletion.
  const [episode] = await db.select().from(radioEpisodes).where(and(eq(radioEpisodes.id, validId(episodeId)), eq(radioEpisodes.hostUserId, hostId))).limit(1).for("update");
  if (!episode) throw new RadioError("这一期不存在，或你没有编辑权限");
  return episode;
}

function orderedEntries(db: RadioDatabase, episodeId: string) {
  return db.select(entrySummaryFields).from(radioEntries)
    .innerJoin(radioEpisodes, eq(radioEntries.episodeId, radioEpisodes.id))
    .where(and(eq(radioEntries.episodeId, episodeId), isNotNull(radioEpisodes.publishedAt)))
    .orderBy(asc(radioEntries.position), asc(radioEntries.createdAt), asc(radioEntries.id));
}

export async function getPublicRadioEpisodes(): Promise<RadioEpisode[]> {
  try {
    return await getDb().select().from(radioEpisodes).where(isNotNull(radioEpisodes.publishedAt)).orderBy(desc(radioEpisodes.episodeNumber));
  } catch (error) {
    if (missingDatabase(error) || missingRadioTables(error)) return [];
    throw error;
  }
}

export async function getPublicRadioEpisode(id: string): Promise<{ episode: RadioEpisode; entries: RadioEntrySummary[] } | null> {
  if (!radioIdSchema.safeParse(id).success) return null;
  try {
    const db = getDb();
    const [episode] = await db.select().from(radioEpisodes).where(and(eq(radioEpisodes.id, id), isNotNull(radioEpisodes.publishedAt))).limit(1);
    if (!episode) return null;
    return { episode, entries: await orderedEntries(db, id) };
  } catch (error) {
    if (missingDatabase(error) || missingRadioTables(error)) return null;
    throw error;
  }
}

export async function getPublicRadioEntry(episodeId: string, entryId: string): Promise<{ episode: RadioEpisode; entry: RadioEntry; entries: RadioEntrySummary[] } | null> {
  if (!radioIdSchema.safeParse(episodeId).success || !radioIdSchema.safeParse(entryId).success) return null;
  try {
    const db = getDb();
    const [row] = await db.select({ episode: radioEpisodes, entry: radioEntries }).from(radioEntries)
      .innerJoin(radioEpisodes, eq(radioEntries.episodeId, radioEpisodes.id))
      .where(and(eq(radioEpisodes.id, episodeId), eq(radioEntries.id, entryId), isNotNull(radioEpisodes.publishedAt))).limit(1);
    if (!row) return null;
    return { ...row, entries: await orderedEntries(db, episodeId) };
  } catch (error) {
    if (missingDatabase(error) || missingRadioTables(error)) return null;
    throw error;
  }
}

export async function getHostRadioEpisodes(): Promise<RadioEpisode[]> {
  const host = await requireHost();
  try {
    const db = getDb();
    await assertActiveHost(db, host.id);
    return await db.select().from(radioEpisodes).where(eq(radioEpisodes.hostUserId, host.id)).orderBy(desc(radioEpisodes.episodeNumber));
  } catch (error) {
    if (missingDatabase(error) || missingRadioTables(error)) return [];
    throw error;
  }
}

export async function getHostRadioEpisode(id: string): Promise<{ episode: RadioEpisode; entries: RadioEntry[] } | null> {
  const host = await requireHost();
  if (!radioIdSchema.safeParse(id).success) return null;
  try {
    const db = getDb();
    await assertActiveHost(db, host.id);
    const [episode] = await db.select().from(radioEpisodes).where(and(eq(radioEpisodes.id, id), eq(radioEpisodes.hostUserId, host.id))).limit(1);
    if (!episode) return null;
    const entries = await db.select().from(radioEntries).where(eq(radioEntries.episodeId, id)).orderBy(asc(radioEntries.position), asc(radioEntries.createdAt), asc(radioEntries.id));
    return { episode, entries };
  } catch (error) {
    if (missingDatabase(error) || missingRadioTables(error)) return null;
    throw error;
  }
}

export async function createRadioEpisode(hostId: string, input: RadioEpisodeInput): Promise<string> {
  const parsed = radioEpisodeSchema.safeParse(input);
  if (!parsed.success) throw new RadioError(parsed.error.issues[0].message);
  try {
    return await getDb().transaction(async (tx) => {
      await assertActiveHost(tx, hostId, true);
      const [episode] = await tx.insert(radioEpisodes).values({ hostUserId: hostId, ...parsed.data }).returning({ id: radioEpisodes.id });
      await tx.insert(activityLogs).values({ actorUserId: hostId, action: "radio_episode_created", metadata: { episodeId: episode.id } });
      return episode.id;
    });
  } catch (error) { return mutationError(error); }
}

export async function updateRadioEpisode(hostId: string, episodeId: string, input: RadioEpisodeInput): Promise<void> {
  const parsed = radioEpisodeSchema.safeParse(input);
  if (!parsed.success) throw new RadioError(parsed.error.issues[0].message);
  try {
    await getDb().transaction(async (tx) => {
      await assertActiveHost(tx, hostId, true);
      await ownedEpisode(tx, hostId, episodeId);
      await tx.update(radioEpisodes).set({ ...parsed.data, updatedAt: new Date() }).where(eq(radioEpisodes.id, episodeId));
      await tx.insert(activityLogs).values({ actorUserId: hostId, action: "radio_episode_updated", metadata: { episodeId } });
    });
  } catch (error) { mutationError(error); }
}

export async function saveRadioEntry(hostId: string, episodeId: string, entryId: string | null, input: RadioEntryInput): Promise<string> {
  const parsed = radioEntrySchema.safeParse(input);
  if (!parsed.success) throw new RadioError(parsed.error.issues[0].message);
  if (entryId) validId(entryId);
  try {
    return await getDb().transaction(async (tx) => {
      await assertActiveHost(tx, hostId, true);
      await ownedEpisode(tx, hostId, episodeId);
      const [entry] = entryId
        ? await tx.update(radioEntries).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(radioEntries.id, entryId), eq(radioEntries.episodeId, episodeId))).returning({ id: radioEntries.id })
        : await tx.insert(radioEntries).values({ ...parsed.data, episodeId }).returning({ id: radioEntries.id });
      if (!entry) throw new RadioError("篇目不存在，或不属于这一期");
      await tx.update(radioEpisodes).set({ updatedAt: new Date() }).where(eq(radioEpisodes.id, episodeId));
      await tx.insert(activityLogs).values({ actorUserId: hostId, action: entryId ? "radio_entry_updated" : "radio_entry_created", metadata: { episodeId, entryId: entry.id } });
      return entry.id;
    });
  } catch (error) { return mutationError(error); }
}

export async function deleteRadioEntry(hostId: string, episodeId: string, entryId: string): Promise<void> {
  validId(entryId);
  try {
    await getDb().transaction(async (tx) => {
      await assertActiveHost(tx, hostId, true);
      const episode = await ownedEpisode(tx, hostId, episodeId);
      if (episode.publishedAt) {
        const entries = await tx.select({ id: radioEntries.id }).from(radioEntries).where(eq(radioEntries.episodeId, episodeId)).limit(2);
        if (entries.length <= 1) throw new RadioError("已发布的一期至少保留一篇内容，请先撤回发布再删除");
      }
      const deleted = await tx.delete(radioEntries).where(and(eq(radioEntries.id, entryId), eq(radioEntries.episodeId, episodeId))).returning({ id: radioEntries.id });
      if (!deleted.length) throw new RadioError("篇目不存在，或不属于这一期");
      await tx.update(radioEpisodes).set({ updatedAt: new Date() }).where(eq(radioEpisodes.id, episodeId));
      await tx.insert(activityLogs).values({ actorUserId: hostId, action: "radio_entry_deleted", metadata: { episodeId, entryId } });
    });
  } catch (error) { mutationError(error); }
}

export async function setRadioEpisodePublished(hostId: string, episodeId: string, published: boolean): Promise<void> {
  if (typeof published !== "boolean") throw new RadioError("发布状态无效");
  try {
    await getDb().transaction(async (tx) => {
      await assertActiveHost(tx, hostId, true);
      const episode = await ownedEpisode(tx, hostId, episodeId);
      if (published) {
        const [entry] = await tx.select({ id: radioEntries.id }).from(radioEntries).where(eq(radioEntries.episodeId, episodeId)).limit(1);
        if (!entry) throw new RadioError("请先添加至少一篇内容，再发布这一期");
      }
      await tx.update(radioEpisodes).set({ publishedAt: published ? episode.publishedAt ?? new Date() : null, updatedAt: new Date() }).where(eq(radioEpisodes.id, episodeId));
      await tx.insert(activityLogs).values({ actorUserId: hostId, action: published ? "radio_episode_published" : "radio_episode_unpublished", metadata: { episodeId } });
    });
  } catch (error) { mutationError(error); }
}
