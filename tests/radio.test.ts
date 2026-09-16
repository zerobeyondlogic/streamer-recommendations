import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { radioEntries, radioEpisodes, users, type RadioEntry, type RadioEpisode } from "../db/schema";
import { radioEntrySchema, radioEpisodeSchema } from "../lib/radio-validation";

const { getDbMock, requireHostMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), requireHostMock: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getDb: getDbMock }));
vi.mock("@/lib/auth", () => ({ requireHost: requireHostMock }));

import {
  createRadioEpisode, deleteRadioEntry, getHostRadioEpisode, getHostRadioEpisodes, getPublicRadioEntry,
  getPublicRadioEpisode, getPublicRadioEpisodes, saveRadioEntry, setRadioEpisodePublished, updateRadioEpisode,
} from "../lib/radio";

const hostId = "10000000-0000-4000-8000-000000000001";
const episodeId = "20000000-0000-4000-8000-000000000002";
const entryId = "30000000-0000-4000-8000-000000000003";
const wrongId = "40000000-0000-4000-8000-000000000004";
const firstDate = new Date("2026-09-16T10:00:00Z");
const episode: RadioEpisode = { id: episodeId, hostUserId: hostId, episodeNumber: 1, title: "晚安故事", publishedAt: null, createdAt: firstDate, updatedAt: firstDate };
const entry: RadioEntry = { id: entryId, episodeId, title: "第一篇", content: "正文只在详情里出现", kind: "story", position: 0, createdAt: firstDate, updatedAt: firstDate };
const episodeInput = { episodeNumber: 1, title: "晚安故事" };
const entryInput = { title: entry.title, content: entry.content, kind: "story" as const, position: 0 };
type Query = { table?: unknown; fields?: Record<string, unknown>; condition?: SQL; lock?: string; joins: SQL[] };
type Write = { table: unknown; values?: Record<string, unknown>; condition?: SQL };

// Script database responses while retaining actual Drizzle predicates. No database
// credentials or network access are needed to verify publication and ownership.
function fixture(rows: unknown[][], returning = [{ id: entryId }]) {
  const reads: Query[] = [];
  const writes: Write[] = [];
  const db = {
    select(fields?: Record<string, unknown>) {
      const record: Query = { fields, joins: [] };
      const query = {
        from(table: unknown) { record.table = table; reads.push(record); return query; },
        innerJoin(_table: unknown, condition: SQL) { record.joins.push(condition); return query; },
        where(condition: SQL) { record.condition = condition; return query; },
        limit() { return query; },
        orderBy() { return query; },
        for(lock: string) { record.lock = lock; return query; },
        then(resolve: (result: unknown[]) => unknown) { return Promise.resolve(rows.shift() ?? []).then(resolve); },
      };
      return query;
    },
    insert(table: unknown) {
      return { values(values: Record<string, unknown>) {
        writes.push({ table, values });
        return { returning: async () => returning };
      } };
    },
    update(table: unknown) {
      return { set(values: Record<string, unknown>) {
        return { where(condition: SQL) {
          writes.push({ table, values, condition });
          return { returning: async () => returning };
        } };
      } };
    },
    delete(table: unknown) {
      return { where(condition: SQL) {
        writes.push({ table, condition });
        return { returning: async () => returning };
      } };
    },
  };
  getDbMock.mockReturnValue({ ...db, transaction: async (callback: (tx: typeof db) => Promise<unknown>) => callback(db) });
  return { reads, writes };
}

function predicate(query: Query | Write) {
  expect(query.condition).toBeDefined();
  return new PgDialect().sqlToQuery(query.condition!);
}

beforeEach(() => {
  vi.resetAllMocks();
  requireHostMock.mockResolvedValue({ id: hostId });
});

describe("电台内容验证", () => {
  it("清理边缘空白并保留正文换行", () => {
    expect(radioEpisodeSchema.parse({ episodeNumber: "2", title: "  故事主题  " })).toEqual({ episodeNumber: 2, title: "故事主题" });
    expect(radioEntrySchema.parse({ ...entryInput, content: "  第一段\n\n第二段  ", position: "10" })).toMatchObject({ content: "第一段\n\n第二段", position: 10 });
  });
  it.each(["", " ", "-1", "0", "1.5", "Infinity", 2147483648, null, true])("拒绝无效期数 %s", (episodeNumber) => {
    expect(radioEpisodeSchema.safeParse({ ...episodeInput, episodeNumber }).success).toBe(false);
  });
  it("限制主题、篇目和正文长度及类型", () => {
    expect(radioEpisodeSchema.safeParse({ ...episodeInput, title: "主".repeat(121) }).success).toBe(false);
    expect(radioEntrySchema.safeParse({ ...entryInput, title: "标".repeat(161) }).success).toBe(false);
    expect(radioEntrySchema.safeParse({ ...entryInput, content: "\n\t " }).success).toBe(false);
    expect(radioEntrySchema.safeParse({ ...entryInput, content: "字".repeat(50000) }).success).toBe(true);
    expect(radioEntrySchema.safeParse({ ...entryInput, content: "字".repeat(50001) }).success).toBe(false);
    expect(radioEntrySchema.safeParse({ ...entryInput, position: -1 }).success).toBe(false);
    expect(radioEntrySchema.safeParse({ ...entryInput, kind: "visitor" }).success).toBe(false);
    expect(radioEntrySchema.safeParse({ ...entryInput, kind: "submission" }).success).toBe(true);
  });
});

describe("公共电台阅读边界", () => {
  it("列表只查询已发布期数", async () => {
    const db = fixture([[{ ...episode, publishedAt: firstDate }]]);
    expect(await getPublicRadioEpisodes()).toHaveLength(1);
    expect(predicate(db.reads[0]).sql).toContain('"radio_episodes"."published_at" is not null');
  });
  it("目录只取标题等摘要字段，两个查询都校验发布状态", async () => {
    const summary = { id: entryId, episodeId, title: entry.title, kind: "story", position: 0 };
    const db = fixture([[{ ...episode, publishedAt: firstDate }], [summary]]);
    expect((await getPublicRadioEpisode(episodeId))?.entries[0]).not.toHaveProperty("content");
    expect(db.reads[1].fields).toEqual({ id: radioEntries.id, episodeId: radioEntries.episodeId, title: radioEntries.title, kind: radioEntries.kind, position: radioEntries.position });
    for (const query of db.reads) expect(predicate(query).sql).toContain('"radio_episodes"."published_at" is not null');
  });
  it("草稿或不存在的期数不继续读取目录", async () => {
    const db = fixture([[]]);
    expect(await getPublicRadioEpisode(episodeId)).toBeNull();
    expect(db.reads).toHaveLength(1);
  });
  it("直接访问篇目也必须匹配父期数并已发布", async () => {
    const db = fixture([[{ episode: { ...episode, publishedAt: firstDate }, entry }], []]);
    expect((await getPublicRadioEntry(episodeId, entryId))?.entry.content).toBe(entry.content);
    const query = predicate(db.reads[0]);
    expect(query.params).toEqual([episodeId, entryId]);
    expect(query.sql).toContain('"radio_episodes"."published_at" is not null');
    expect(new PgDialect().sqlToQuery(db.reads[0].joins[0]).sql).toContain('"radio_entries"."episode_id" = "radio_episodes"."id"');
  });
  it("错误父期数、草稿和未发布篇目均返回未找到", async () => {
    const db = fixture([[]]);
    expect(await getPublicRadioEntry(wrongId, entryId)).toBeNull();
    expect(predicate(db.reads[0]).params).toContain(wrongId);
    expect(db.reads).toHaveLength(1);
  });
  it("非法 ID 在查询前直接返回未找到", async () => {
    expect(await getPublicRadioEpisode("not-a-uuid")).toBeNull();
    expect(await getPublicRadioEntry(episodeId, "not-a-uuid")).toBeNull();
    expect(getDbMock).not.toHaveBeenCalled();
  });
});

describe("主播权限与发布生命周期", () => {
  const operations = [
    ["create", () => createRadioEpisode(hostId, episodeInput)],
    ["update", () => updateRadioEpisode(hostId, episodeId, episodeInput)],
    ["save", () => saveRadioEntry(hostId, episodeId, null, entryInput)],
    ["delete", () => deleteRadioEntry(hostId, episodeId, entryId)],
    ["publish", () => setRadioEpisodePublished(hostId, episodeId, true)],
  ] as const;

  it.each(operations)("%s 拒绝无效主播且没有写入", async (_name, operation) => {
    const db = fixture([[]]);
    await expect(operation()).rejects.toThrow("只有已启用的主播账号");
    expect(db.writes).toHaveLength(0);
    expect(db.reads[0].table).toBe(users);
    expect(predicate(db.reads[0]).params).toEqual([hostId, "host", "active"]);
    expect(db.reads[0].lock).toBe("share");
  });

  it("后台列表和详情仍按当前主播筛选所有权", async () => {
    const db = fixture([[{ id: hostId }], [episode], [{ id: hostId }], [episode], [entry]]);
    expect(await getHostRadioEpisodes()).toHaveLength(1);
    expect((await getHostRadioEpisode(episodeId))?.entries).toHaveLength(1);
    expect(requireHostMock).toHaveBeenCalledTimes(2);
    expect(predicate(db.reads[1]).params).toEqual([hostId]);
    expect(predicate(db.reads[3]).params).toEqual([episodeId, hostId]);
  });

  it.each(operations.slice(1))("%s 拒绝修改其他主播期数", async (_name, operation) => {
    const db = fixture([[{ id: hostId }], []]);
    await expect(operation()).rejects.toThrow("没有编辑权限");
    expect(db.writes).toHaveLength(0);
    expect(predicate(db.reads[1]).params).toEqual([episodeId, hostId]);
  });

  it("新建默认保持草稿", async () => {
    const db = fixture([[{ id: hostId }]], [{ id: episodeId }]);
    expect(await createRadioEpisode(hostId, episodeInput)).toBe(episodeId);
    expect(db.writes[0].values).toEqual({ hostUserId: hostId, ...episodeInput });
    expect(db.writes[0].values).not.toHaveProperty("publishedAt");
  });

  it("空期数不能发布", async () => {
    const db = fixture([[{ id: hostId }], [episode], []]);
    await expect(setRadioEpisodePublished(hostId, episodeId, true)).rejects.toThrow("至少一篇内容");
    expect(db.writes).toHaveLength(0);
    expect(db.reads[1].lock).toBe("update");
  });

  it("重复发布保留原发布时间，撤回清空发布时间", async () => {
    const db = fixture([[{ id: hostId }], [{ ...episode, publishedAt: firstDate }], [{ id: entryId }], [{ id: hostId }], [{ ...episode, publishedAt: firstDate }]]);
    await setRadioEpisodePublished(hostId, episodeId, true);
    await setRadioEpisodePublished(hostId, episodeId, false);
    const updates = db.writes.filter((write) => write.table === radioEpisodes);
    expect(updates[0].values?.publishedAt).toBe(firstDate);
    expect(updates[1].values?.publishedAt).toBeNull();
  });

  it("已发布的最后一篇必须撤回整期后才能删除", async () => {
    const db = fixture([[{ id: hostId }], [{ ...episode, publishedAt: firstDate }], [{ id: entryId }]]);
    await expect(deleteRadioEntry(hostId, episodeId, entryId)).rejects.toThrow("先撤回发布再删除");
    expect(db.writes).toHaveLength(0);
    expect(db.reads[1].lock).toBe("update");
  });

  it.each(["save", "delete"])("%s 同时校验篇目和父期数，拒绝跨期操作", async (operation) => {
    const db = fixture([[{ id: hostId }], [episode]], []);
    const result = operation === "save" ? saveRadioEntry(hostId, episodeId, wrongId, entryInput) : deleteRadioEntry(hostId, episodeId, wrongId);
    await expect(result).rejects.toThrow("不属于这一期");
    expect(predicate(db.writes[0]).params).toEqual([wrongId, episodeId]);
  });

  it("更新已有篇目保留父级归属且锁定父期数", async () => {
    const db = fixture([[{ id: hostId }], [episode]]);
    expect(await saveRadioEntry(hostId, episodeId, entryId, entryInput)).toBe(entryId);
    expect(db.reads[1].lock).toBe("update");
    expect(predicate(db.writes[0]).params).toEqual([entryId, episodeId]);
    expect(db.writes[0].values).not.toHaveProperty("episodeId");
  });
});

describe("数据库错误处理", () => {
  it("未配置数据库或缺少电台新表时公共读取安全降级", async () => {
    for (const error of [new Error("DATABASE_URL_MISSING"), { cause: { code: "42P01", message: 'relation "radio_episodes" does not exist' } }]) {
      getDbMock.mockImplementation(() => { throw error; });
      expect(await getPublicRadioEpisodes()).toEqual([]);
      expect(await getPublicRadioEpisode(episodeId)).toBeNull();
      expect(await getPublicRadioEntry(episodeId, entryId)).toBeNull();
    }
  });
  it("不会掩盖权限、连接或其他缺表错误", async () => {
    for (const error of [new Error("connection failed"), { code: "42P01", message: 'relation "users" does not exist' }]) {
      getDbMock.mockImplementation(() => { throw error; });
      await expect(getPublicRadioEpisodes()).rejects.toBe(error);
    }
  });
  it("新表未迁移时发布操作给出可操作提示", async () => {
    getDbMock.mockImplementation(() => { throw { cause: { code: "42P01", message: 'relation "radio_entries" does not exist' } }; });
    await expect(createRadioEpisode(hostId, episodeInput)).rejects.toThrow("执行数据库迁移");
  });
  it("期数重复会提示更换期数", async () => {
    getDbMock.mockImplementation(() => { throw { cause: { code: "23505", constraint: "radio_episodes_number_uidx" } }; });
    await expect(createRadioEpisode(hostId, episodeInput)).rejects.toThrow("期数已经存在");
  });
});
