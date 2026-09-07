import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { notifications } from "../db/schema";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ getDb: getDbMock }));

import { getHostStats, unreadNotificationCount } from "../lib/data";

describe("工作台个人通知计数", () => {
  const queries: { table: unknown; condition?: SQL }[] = [];
  const dialect = new PgDialect();

  beforeEach(() => {
    queries.length = 0;
    getDbMock.mockReturnValue({
      select: () => {
        const record: { table: unknown; condition?: SQL } = { table: null };
        const query = {
          from(table: unknown) { record.table = table; queries.push(record); return query; },
          where(condition: SQL) { record.condition = condition; return query; },
          then(resolve: (rows: { value: number }[]) => unknown) { return Promise.resolve([{ value: 2 }]).then(resolve); },
        };
        return query;
      },
    });
  });

  it.each([
    "10000000-0000-4000-8000-000000000001",
    "20000000-0000-4000-8000-000000000002",
  ])("工作台与顶栏对账号 %s 使用一致的未读范围", async (hostId) => {
    const stats = await getHostStats(hostId);
    const headerCount = await unreadNotificationCount(hostId);
    expect(stats[5]).toBe(headerCount);
    const notificationQueries = queries.filter((query) => query.table === notifications);
    expect(notificationQueries).toHaveLength(2);
    const compiled = notificationQueries.map((query) => dialect.sqlToQuery(query.condition!));
    expect(compiled[0]).toEqual(compiled[1]);
    for (const query of compiled) {
      expect(query.sql).toContain('"notifications"."user_id" =');
      expect(query.sql).toContain('"notifications"."read_at" is null');
      expect(query.params).toEqual([hostId]);
    }
  });
});
