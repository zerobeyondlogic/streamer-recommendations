import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { radioEntries, radioEpisodes, users, type RadioEntry, type RadioEpisode } from "../db/schema";
import { sha256 } from "../lib/security";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("../db", () => ({ getDb: getDbMock }));

import { createFullBackup, createXlsxExport, SCHEMA_VERSION, validateBackup } from "../lib/export";

const createdAt = new Date("2026-09-16T08:00:00.000Z");
const episode: RadioEpisode = {
  id: "10000000-0000-4000-8000-000000000001", hostUserId: "20000000-0000-4000-8000-000000000002",
  episodeNumber: 1, title: "=电台主题", publishedAt: null, createdAt, updatedAt: createdAt,
};
const entry: RadioEntry = {
  id: "30000000-0000-4000-8000-000000000003", episodeId: episode.id, title: "+观众来信",
  kind: "submission", position: 2, content: "@一封来自别处的信\n保留完整正文。", createdAt, updatedAt: createdAt,
};

function databaseFixture(entries: RadioEntry[] = [entry]) {
  const rows = new Map<unknown, unknown[]>([
    [users, [{ id: episode.hostUserId, username: "小羊老师" }]],
    [radioEpisodes, [episode, { ...episode, id: "40000000-0000-4000-8000-000000000004", episodeNumber: 2, title: "第二期", publishedAt: createdAt }]],
    [radioEntries, entries],
  ]);
  getDbMock.mockReturnValue({ select: () => ({ from: (table: unknown) => Promise.resolve(rows.get(table) ?? []) }) });
}

async function archive() {
  return JSZip.loadAsync((await createFullBackup()).bytes);
}

async function refreshChecksums(zip: JSZip) {
  const files = Object.values(zip.files).filter(file => !file.dir && file.name !== "checksums.sha256");
  const lines = await Promise.all(files.map(async file => `${sha256(Buffer.from(await file.async("uint8array")))}  ${file.name}`));
  zip.file("checksums.sha256", `${lines.join("\n")}\n`);
  return zip.generateAsync({ type: "nodebuffer" });
}

beforeEach(() => {
  vi.clearAllMocks();
  databaseFixture();
});

describe("电台完整备份", () => {
  it("草稿、已发布期数、目录归属与正文经过 ZIP 校验后完整保留", async () => {
    const data = await validateBackup((await createFullBackup()).bytes);
    expect(data.manifest).toMatchObject({ schemaVersion: SCHEMA_VERSION, counts: { radioEpisodes: 2, radioEntries: 1 } });
    expect(data.radioEpisodes).toHaveLength(2);
    expect(data.radioEpisodes[0]).toEqual({ ...episode, createdAt: createdAt.toISOString(), updatedAt: createdAt.toISOString() });
    expect(data.radioEpisodes[1].publishedAt).toBe(createdAt.toISOString());
    expect(data.radioEntries).toEqual([{ ...entry, createdAt: createdAt.toISOString(), updatedAt: createdAt.toISOString() }]);
  });

  it.each(["13", "14"])("schema %s 的旧备份仍可读取，电台内容为空", async (version) => {
    const zip = await archive();
    zip.remove("radio-episodes.json");
    zip.remove("radio-entries.json");
    zip.file("schema-version.txt", `${version}\n`);
    zip.file("manifest.json", JSON.stringify({ schemaVersion: version }));
    const data = await validateBackup(await refreshChecksums(zip));
    expect(data.radioEpisodes).toEqual([]);
    expect(data.radioEntries).toEqual([]);
    expect(data.users).toHaveLength(1);
  });

  it.each(["radio-episodes.json", "radio-entries.json"])("新备份不能缺少 %s，即使重新生成了校验表", async (name) => {
    const zip = await archive();
    zip.remove(name);
    await expect(validateBackup(await refreshChecksums(zip))).rejects.toThrow(`备份缺少 ${name}`);
  });

  it("拒绝校验表漏掉的电台文件", async () => {
    const zip = await archive();
    const checksums = await zip.file("checksums.sha256")!.async("text");
    zip.file("checksums.sha256", checksums.split("\n").filter(line => !line.endsWith("radio-entries.json")).join("\n"));
    await expect(validateBackup(await zip.generateAsync({ type: "nodebuffer" }))).rejects.toThrow("radio-entries.json 的校验值");
  });

  it("拒绝正文被篡改的备份", async () => {
    const zip = await archive();
    zip.file("radio-entries.json", JSON.stringify([{ ...entry, content: "被改写" }]));
    await expect(validateBackup(await zip.generateAsync({ type: "nodebuffer" }))).rejects.toThrow("radio-entries.json 校验值不匹配");
  });

  it("拒绝把非数组内容默默当作空电台恢复", async () => {
    const zip = await archive();
    zip.file("radio-entries.json", JSON.stringify({ content: "错误的数据结构" }));
    await expect(validateBackup(await refreshChecksums(zip))).rejects.toThrow("radio-entries.json 必须是记录数组");
  });

  it("拒绝清单与版本文件不一致的备份", async () => {
    const zip = await archive();
    zip.file("schema-version.txt", "14\n");
    await expect(validateBackup(await refreshChecksums(zip))).rejects.toThrow("版本不一致");
  });
});

describe("电台 XLSX 导出", () => {
  it("生成两张电台工作表，包含草稿、正文并安全处理公式开头的文字", async () => {
    const zip = await JSZip.loadAsync((await createXlsxExport()).bytes);
    const workbook = await zip.file("xl/workbook.xml")!.async("text");
    expect(workbook).toContain('name="电台期数"');
    expect(workbook).toContain('name="电台内容"');
    const strings = await zip.file("xl/sharedStrings.xml")!.async("text");
    expect(strings).toContain("草稿");
    expect(strings).toContain("已发布");
    expect(strings).toContain("观众投稿");
    expect(strings).toContain("'=电台主题");
    expect(strings).toContain("'+观众来信");
    expect(strings).toContain("'@一封来自别处的信");
    expect(strings).toContain("保留完整正文。");
  });

  it("长故事分为正文和续文，避免 Excel 单元格长度限制且不截断 emoji", async () => {
    const content = `${"故".repeat(29_999)}🐑${"事".repeat(19_999)}`;
    databaseFixture([{ ...entry, content }]);
    const zip = await JSZip.loadAsync((await createXlsxExport()).bytes);
    const strings = await zip.file("xl/sharedStrings.xml")!.async("text");
    expect(strings).toContain(`<t>${"故".repeat(29_999)}</t>`);
    expect(strings).toContain(`<t>🐑${"事".repeat(19_999)}</t>`);
    expect(strings).not.toContain("�");
  });
});
