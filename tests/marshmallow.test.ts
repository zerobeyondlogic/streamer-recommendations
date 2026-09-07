import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { activityLogs, marshmallows, notifications, users, type Marshmallow } from "../db/schema";
import { marshmallowReplySchema } from "../lib/validation";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ getDb: getDbMock }));

import {
  getMyMarshmallows,
  getPublicMarshmallows,
  markMarshmallowRead,
  publishMarshmallow,
  restoreMarshmallow,
  saveMarshmallowReply,
  softDeleteMarshmallow,
  unpublishMarshmallow,
} from "../lib/data";

const hostId = "10000000-0000-4000-8000-000000000001";
const ownerId = "20000000-0000-4000-8000-000000000002";
const marshmallowId = "30000000-0000-4000-8000-000000000003";
const firstDate = new Date("2026-08-01T10:00:00.000Z");
const now = new Date("2026-09-01T10:00:00.000Z");

type RecordedQuery = { table: unknown; condition?: SQL; fields?: Record<string, unknown>; lock?: string };
type RecordedWrite = { table: unknown; values: Record<string, unknown>; condition?: SQL };

// The fake never loads a database driver or credentials. Real data functions run
// against one row; SQL predicates remain available for authorization assertions.
function databaseFixture(overrides: Partial<Marshmallow> = {}) {
  const item: Marshmallow = {
    id: marshmallowId, userId: ownerId, content: "一颗棉花糖", allowPublic: true,
    readAt: null, readBy: null, publishedAt: null, deletedAt: null, deletedBy: null,
    replyContent: null, repliedAt: null, replyUpdatedAt: null, repliedBy: null,
    unpublishedAt: null, createdAt: firstDate, updatedAt: firstDate, ...overrides,
  };
  const state = { item, hostAvailable: true, itemAvailable: true };
  const selects: RecordedQuery[] = [];
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  const deletes: Omit<RecordedWrite, "values">[] = [];
  const tx = {
    select(fields?: Record<string, unknown>) {
      const record: RecordedQuery = { table: undefined, fields };
      const query = {
        from(table: unknown) { record.table = table; selects.push(record); return query; },
        where(condition: SQL) { record.condition = condition; return query; },
        limit() { return query; },
        offset() { return query; },
        orderBy() { return query; },
        for(lock: string) { record.lock = lock; return query; },
        then(resolve: (rows: Record<string, unknown>[]) => unknown) {
          const rows = record.table === users
            ? state.hostAvailable ? [{ id: hostId }] : []
            : state.itemAvailable ? [{ ...state.item }] : [];
          return Promise.resolve(rows).then(resolve);
        },
      };
      return query;
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          return {
            async where(condition: SQL) {
              updates.push({ table, values, condition });
              if (table === marshmallows) Object.assign(state.item, values);
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return { async values(values: Record<string, unknown>) { inserts.push({ table, values }); } };
    },
    delete(table: unknown) {
      return { async where(condition: SQL) { deletes.push({ table, condition }); } };
    },
  };
  getDbMock.mockReturnValue({ ...tx, transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) });
  return { state, selects, updates, inserts, deletes };
}

function queryOf(condition: SQL | undefined) {
  expect(condition).toBeDefined();
  return new PgDialect().sqlToQuery(condition!);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => vi.useRealTimers());

describe("棉花糖处理与上墙相互独立", () => {
  it.each([true, false])("允许公开为 %s 时，只读仍保持未公开", async (allowPublic) => {
    const db = databaseFixture({ allowPublic });
    await markMarshmallowRead(hostId, marshmallowId);
    expect(db.state.item).toMatchObject({ readAt: now, readBy: hostId, publishedAt: null, allowPublic });
    expect(db.updates[0].values).not.toHaveProperty("publishedAt");
  });

  it("重复标记已读不刷新时间，也不改动已经上墙的状态", async () => {
    const db = databaseFixture({ readAt: firstDate, readBy: hostId, publishedAt: firstDate });
    await markMarshmallowRead(hostId, marshmallowId);
    expect(db.state.item.readAt).toBe(firstDate);
    expect(db.state.item.publishedAt).toBe(firstDate);
    expect(db.updates).toHaveLength(0);
  });

  it("上墙自动已读，再次上墙不改变第一次上墙时间", async () => {
    const db = databaseFixture();
    await publishMarshmallow(hostId, marshmallowId);
    expect(db.state.item).toMatchObject({ readAt: now, publishedAt: now, readBy: hostId });
    vi.setSystemTime(new Date("2026-09-02T10:00:00.000Z"));
    await publishMarshmallow(hostId, marshmallowId);
    expect(db.updates).toHaveLength(1);
    expect(db.state.item.publishedAt).toEqual(now);
  });

  it("投稿者未同意公开时，上墙失败且不写入任何记录", async () => {
    const db = databaseFixture({ allowPublic: false, replyContent: "私密回复" });
    await expect(publishMarshmallow(hostId, marshmallowId)).rejects.toThrow("投稿人未允许公开");
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
    expect(db.state.item.publishedAt).toBeNull();
  });

  it("下架只撤销公开，保留已读、回复和点赞记录；再次上墙仍保留它们", async () => {
    const db = databaseFixture({ readAt: firstDate, readBy: hostId, publishedAt: firstDate, replyContent: "已回复", repliedAt: firstDate });
    await unpublishMarshmallow(hostId, marshmallowId);
    expect(db.state.item).toMatchObject({ publishedAt: null, unpublishedAt: now, readAt: firstDate, replyContent: "已回复", repliedAt: firstDate });
    expect(db.deletes).toHaveLength(0);
    await publishMarshmallow(hostId, marshmallowId);
    expect(db.state.item).toMatchObject({ publishedAt: now, unpublishedAt: null, readAt: firstDate, replyContent: "已回复" });
  });

  it("移除已上墙内容后恢复，不会偷偷重新上墙", async () => {
    const db = databaseFixture({ publishedAt: firstDate, readAt: firstDate, replyContent: "保留的回复" });
    await softDeleteMarshmallow(hostId, marshmallowId);
    expect(db.state.item).toMatchObject({ deletedAt: now, publishedAt: null });
    await restoreMarshmallow(hostId, marshmallowId);
    expect(db.state.item).toMatchObject({ deletedAt: null, deletedBy: null, publishedAt: null, readAt: firstDate, replyContent: "保留的回复" });
    expect(db.deletes).toHaveLength(0);
  });

  it("兼容历史已移除但仍保存公开时间的记录，恢复时同样保持下架", async () => {
    const db = databaseFixture({ deletedAt: firstDate, deletedBy: hostId, publishedAt: firstDate });
    await restoreMarshmallow(hostId, marshmallowId);
    expect(db.state.item).toMatchObject({ deletedAt: null, publishedAt: null, unpublishedAt: now });
  });

  it("私密棉花糖移除后恢复，公开授权、未读和回复保持原值", async () => {
    const db = databaseFixture({ allowPublic: false });
    await softDeleteMarshmallow(hostId, marshmallowId);
    await restoreMarshmallow(hostId, marshmallowId);
    expect(db.state.item).toMatchObject({ allowPublic: false, readAt: null, publishedAt: null, replyContent: null, unpublishedAt: null });
  });
});

describe("棉花糖管理权限", () => {
  const operations = [markMarshmallowRead, publishMarshmallow, unpublishMarshmallow, softDeleteMarshmallow, restoreMarshmallow];

  it.each(operations.map((operation) => [operation.name, operation] as const))("%s 拒绝非有效主播", async (_name, operation) => {
    const db = databaseFixture();
    db.state.hostAvailable = false;
    await expect(operation(ownerId, marshmallowId)).rejects.toThrow("只有主播可以管理棉花糖");
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
    const hostQuery = queryOf(db.selects[0].condition);
    expect(hostQuery.params).toEqual([ownerId, "host", "active"]);
    expect(hostQuery.sql).toContain('"users"."role"');
    expect(hostQuery.sql).toContain('"users"."status"');
  });

  it("回复同样需要有效主播身份", async () => {
    const db = databaseFixture();
    db.state.hostAvailable = false;
    await expect(saveMarshmallowReply(ownerId, marshmallowId, "回复")).rejects.toThrow("只有主播可以管理棉花糖");
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  it("已移除棉花糖不能被阅读、上墙或回复", async () => {
    const db = databaseFixture({ deletedAt: firstDate });
    await expect(markMarshmallowRead(hostId, marshmallowId)).rejects.toThrow("已经移除");
    await expect(publishMarshmallow(hostId, marshmallowId)).rejects.toThrow("已经移除");
    await expect(saveMarshmallowReply(hostId, marshmallowId, "回复")).rejects.toThrow("已经移除");
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  it("修改前锁住目标记录，以当前公开授权判断上墙权限", async () => {
    const db = databaseFixture();
    await publishMarshmallow(hostId, marshmallowId);
    const selected = db.selects.find((query) => query.table === marshmallows)!;
    expect(selected.lock).toBe("update");
    expect(queryOf(selected.condition).params).toEqual([marshmallowId]);
  });
});

describe("主播回复棉花糖", () => {
  it("私密回复会标记已读，并只通知该棉花糖作者", async () => {
    const db = databaseFixture({ allowPublic: false });
    await saveMarshmallowReply(hostId, marshmallowId, "收到了 BV16v3t6GEpY");
    expect(db.state.item).toMatchObject({ replyContent: "收到了 BV16v3t6GEpY", readAt: now, repliedAt: now, replyUpdatedAt: now, publishedAt: null });
    expect(db.updates[0].values).not.toHaveProperty("publishedAt");
    expect(db.inserts.filter((insert) => insert.table === notifications)).toEqual([
      { table: notifications, values: { userId: ownerId, actorUserId: hostId, type: "marshmallow_reply", marshmallowId } },
    ]);
  });

  it("修改回复保留首次回复时间，替换同一棉花糖的提醒，不自动上墙", async () => {
    const db = databaseFixture({ replyContent: "旧回复", repliedAt: firstDate, readAt: firstDate });
    await saveMarshmallowReply(hostId, marshmallowId, "新回复");
    expect(db.state.item).toMatchObject({ replyContent: "新回复", repliedAt: firstDate, readAt: firstDate, replyUpdatedAt: now, publishedAt: null });
    expect(db.deletes).toHaveLength(1);
    expect(db.deletes[0].table).toBe(notifications);
    expect(queryOf(db.deletes[0].condition).params).toEqual([marshmallowId, "marshmallow_reply"]);
    expect(db.inserts.filter((insert) => insert.table === notifications)).toHaveLength(1);
    expect(db.inserts.find((insert) => insert.table === activityLogs)?.values.action).toBe("marshmallow_reply_updated");
  });

  it("重复保存相同回复不更新、也不重复提醒", async () => {
    const db = databaseFixture({ replyContent: "已回复", repliedAt: firstDate });
    await saveMarshmallowReply(hostId, marshmallowId, "已回复");
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
    expect(db.deletes).toHaveLength(0);
  });

  it("兼容主播自己的历史投稿，回复自己不发通知", async () => {
    const db = databaseFixture({ userId: hostId });
    await saveMarshmallowReply(hostId, marshmallowId, "补充说明");
    expect(db.state.item.replyContent).toBe("补充说明");
    expect(db.inserts.filter((insert) => insert.table === notifications)).toHaveLength(0);
  });

  it("回复内容清理首尾空白，并拒绝空内容及超长回复", () => {
    expect(marshmallowReplySchema.parse({ content: "  回复  " })).toEqual({ content: "回复" });
    expect(marshmallowReplySchema.safeParse({ content: "  " }).success).toBe(false);
    expect(marshmallowReplySchema.safeParse({ content: "回".repeat(2001) }).success).toBe(false);
  });
});

describe("棉花糖查询隐私边界", () => {
  it("公开列表要求作者同意、已经上墙且未移除，同时不选取作者身份", async () => {
    const db = databaseFixture({ replyContent: "公开回复", publishedAt: firstDate });
    await getPublicMarshmallows();
    const query = db.selects[0];
    const compiled = queryOf(query.condition);
    expect(compiled.sql).toContain('"marshmallows"."allow_public" =');
    expect(compiled.params).toEqual([true]);
    expect(compiled.sql).toContain('"marshmallows"."published_at" is not null');
    expect(compiled.sql).toContain('"marshmallows"."deleted_at" is null');
    expect(query.fields).toHaveProperty("replyContent");
    expect(query.fields).not.toHaveProperty("userId");
    expect(query.fields).not.toHaveProperty("username");
  });

  it("我的投稿按当前用户限定查询，私密回复也在作者可读字段中", async () => {
    const db = databaseFixture({ allowPublic: false, replyContent: "私密回复" });
    await getMyMarshmallows(ownerId);
    const query = db.selects[0];
    expect(queryOf(query.condition).params).toEqual([ownerId]);
    expect(queryOf(query.condition).sql).toContain('"marshmallows"."user_id"');
    expect(query.fields).toHaveProperty("replyContent");
  });
});
