import { expect, it, vi } from "vitest";
import { desc } from "drizzle-orm";
import type { getDb as database } from "../db";

const scoped = vi.hoisted(() => ({ current: null as ReturnType<typeof database> | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db")>();
  return { ...actual, getDb: () => scoped.current ?? actual.getDb() };
});

// Explicit opt-in against a migrated database; all fixture changes roll back.
it.skipIf(process.env.RUN_DB_INTEGRATION !== "1")("电台真实数据库流程保护草稿、跨期归属并支持发布后撤回", async () => {
  await import("dotenv/config");
  const { getDb, closeDb } = await import("@/db");
  const { users, radioEpisodes } = await import("../db/schema");
  const { createRadioEpisode, saveRadioEntry, setRadioEpisodePublished, deleteRadioEntry, getPublicRadioEpisode, getPublicRadioEntry } = await import("../lib/radio");
  const rollback = new Error("ROLLBACK_RADIO_TEST_FIXTURES");
  try {
    await expect(getDb().transaction(async (tx) => {
      scoped.current = tx as unknown as ReturnType<typeof database>;
      const suffix = crypto.randomUUID().slice(0, 12);
      const [host, otherHost, viewer] = await tx.insert(users).values([
        { username: `radio-host-${suffix}`, usernameNormalized: `radio-host-${suffix}`, passwordHash: "test-only-no-login", role: "host" as const, status: "active" as const },
        { username: `radio-other-${suffix}`, usernameNormalized: `radio-other-${suffix}`, passwordHash: "test-only-no-login", role: "host" as const, status: "active" as const },
        { username: `radio-viewer-${suffix}`, usernameNormalized: `radio-viewer-${suffix}`, passwordHash: "test-only-no-login", role: "user" as const, status: "active" as const },
      ]).returning();
      const [latest] = await tx.select({ number: radioEpisodes.episodeNumber }).from(radioEpisodes).orderBy(desc(radioEpisodes.episodeNumber)).limit(1);
      const number = (latest?.number ?? 0) + 1;
      await expect(createRadioEpisode(viewer.id, { episodeNumber: number, title: "禁止观众创建" })).rejects.toThrow("只有已启用的主播");
      const id = await createRadioEpisode(host.id, { episodeNumber: number, title: "测试电台主题" });
      await expect(setRadioEpisodePublished(host.id, id, true)).rejects.toThrow("至少一篇");
      const entryId = await saveRadioEntry(host.id, id, null, { title: "故事", content: "第一段\n\n第二段", kind: "story", position: 1 });
      expect(await getPublicRadioEpisode(id)).toBeNull();
      expect(await getPublicRadioEntry(id, entryId)).toBeNull();
      await expect(saveRadioEntry(otherHost.id, id, entryId, { title: "越权", content: "越权正文", kind: "story", position: 1 })).rejects.toThrow("没有编辑权限");
      await setRadioEpisodePublished(host.id, id, true);
      expect((await getPublicRadioEpisode(id))?.entries[0]).not.toHaveProperty("content");
      expect((await getPublicRadioEntry(id, entryId))?.entry.content).toBe("第一段\n\n第二段");
      const otherId = await createRadioEpisode(host.id, { episodeNumber: number + 1, title: "另一期" });
      expect(await getPublicRadioEntry(otherId, entryId)).toBeNull();
      await expect(deleteRadioEntry(host.id, id, entryId)).rejects.toThrow("先撤回发布");
      await setRadioEpisodePublished(host.id, id, false);
      expect(await getPublicRadioEpisode(id)).toBeNull();
      expect(await getPublicRadioEntry(id, entryId)).toBeNull();
      await deleteRadioEntry(host.id, id, entryId);
      throw rollback;
    })).rejects.toBe(rollback);
  } finally {
    scoped.current = null;
    await closeDb();
  }
}, 120_000);
