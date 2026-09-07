import { expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { getDb as database } from "../db";

const scoped = vi.hoisted(() => ({ current: null as ReturnType<typeof database> | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db")>();
  return { ...actual, getDb: () => scoped.current ?? actual.getDb() };
});

// Explicit opt-in. All fixture writes and lifecycle changes are rolled back together.
it.skipIf(process.env.RUN_DB_INTEGRATION !== "1")("棉花糖真实数据库流程可阅读、回复、上下架且始终保护私密内容", async () => {
  await import("dotenv/config");
  const { getDb, closeDb } = await import("@/db");
  const { users, marshmallows, marshmallowLikes, notifications } = await import("../db/schema");
  const { markMarshmallowRead, publishMarshmallow, unpublishMarshmallow, saveMarshmallowReply, softDeleteMarshmallow, restoreMarshmallow, getMyMarshmallows, getPublicMarshmallows, toggleMarshmallowLike } = await import("../lib/data");
  const rollback = new Error("ROLLBACK_TEST_FIXTURES");
  try {
    await expect(getDb().transaction(async (tx) => {
      scoped.current = tx as unknown as ReturnType<typeof database>;
      const suffix = crypto.randomUUID().slice(0, 12);
      const [host] = await tx.insert(users).values({ username: `qa-host-${suffix}`, usernameNormalized: `qa-host-${suffix}`, passwordHash: "test-only-no-login", role: "host", status: "active" }).returning();
      const [viewer] = await tx.insert(users).values({ username: `qa-user-${suffix}`, usernameNormalized: `qa-user-${suffix}`, passwordHash: "test-only-no-login", role: "user", status: "active" }).returning();
      const [publicItem, privateItem] = await tx.insert(marshmallows).values([
        { userId: viewer.id, content: "qa eligible", allowPublic: true },
        { userId: viewer.id, content: "qa private", allowPublic: false },
      ]).returning();
      const read = async (id: string) => (await tx.select().from(marshmallows).where(eq(marshmallows.id, id)))[0];

      await expect(publishMarshmallow(viewer.id, publicItem.id)).rejects.toThrow("只有主播");
      await markMarshmallowRead(host.id, publicItem.id);
      expect(await read(publicItem.id)).toMatchObject({ readAt: expect.any(Date), publishedAt: null });
      await saveMarshmallowReply(host.id, publicItem.id, "回信 BV16v3t6GEpY");
      expect(await read(publicItem.id)).toMatchObject({ publishedAt: null, replyContent: "回信 BV16v3t6GEpY" });
      await publishMarshmallow(host.id, publicItem.id);
      const firstPublication = (await read(publicItem.id)).publishedAt;
      await publishMarshmallow(host.id, publicItem.id);
      expect((await read(publicItem.id)).publishedAt).toEqual(firstPublication);
      await toggleMarshmallowLike(viewer.id, publicItem.id);
      await unpublishMarshmallow(host.id, publicItem.id);
      expect(await read(publicItem.id)).toMatchObject({ publishedAt: null, unpublishedAt: expect.any(Date), readAt: expect.any(Date), replyContent: "回信 BV16v3t6GEpY" });
      expect((await getPublicMarshmallows(1, viewer.id)).items.some((item) => item.id === publicItem.id)).toBe(false);
      await expect(toggleMarshmallowLike(viewer.id, publicItem.id)).rejects.toThrow("尚未公开");
      expect(await tx.select().from(marshmallowLikes).where(eq(marshmallowLikes.marshmallowId, publicItem.id))).toHaveLength(1);
      await publishMarshmallow(host.id, publicItem.id);
      await softDeleteMarshmallow(host.id, publicItem.id);
      await restoreMarshmallow(host.id, publicItem.id);
      expect(await read(publicItem.id)).toMatchObject({ deletedAt: null, publishedAt: null, readAt: expect.any(Date) });

      await saveMarshmallowReply(host.id, privateItem.id, "只给投稿人的回信");
      await saveMarshmallowReply(host.id, privateItem.id, "更新后的私密回信");
      await expect(publishMarshmallow(host.id, privateItem.id)).rejects.toThrow("未允许公开");
      expect(await read(privateItem.id)).toMatchObject({ publishedAt: null, readAt: expect.any(Date) });
      const reminders = await tx.select().from(notifications).where(eq(notifications.marshmallowId, privateItem.id));
      expect(reminders).toHaveLength(1);
      expect(reminders[0]).toMatchObject({ userId: viewer.id, type: "marshmallow_reply" });
      const mine = await getMyMarshmallows(viewer.id, 2, privateItem.id);
      expect(mine.page).toBe(1);
      expect(mine.items.find((item) => item.id === privateItem.id)?.replyContent).toBe("更新后的私密回信");
      expect((await getMyMarshmallows(host.id, 1, privateItem.id)).items).toHaveLength(0);
      expect((await getPublicMarshmallows()).items.some((item) => item.id === privateItem.id)).toBe(false);
      throw rollback;
    })).rejects.toBe(rollback);
  } finally {
    scoped.current = null;
    await closeDb();
  }
}, 120_000);
