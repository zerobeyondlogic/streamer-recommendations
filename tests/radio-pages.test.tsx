import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RadioEntry, RadioEpisode } from "@/lib/radio";

const { episodesMock, episodeMock, entryMock, notFoundMock, hostEpisodesMock, hostEpisodeMock } = vi.hoisted(() => ({
  episodesMock: vi.fn(),
  episodeMock: vi.fn(),
  entryMock: vi.fn(),
  notFoundMock: vi.fn(),
  hostEpisodesMock: vi.fn(),
  hostEpisodeMock: vi.fn(),
}));

vi.mock("@/lib/radio", () => ({
  getPublicRadioEpisodes: episodesMock,
  getPublicRadioEpisode: episodeMock,
  getPublicRadioEntry: entryMock,
  getHostRadioEpisodes: hostEpisodesMock,
  getHostRadioEpisode: hostEpisodeMock,
}));
vi.mock("@/lib/auth", () => ({ requireHost: vi.fn() }));
vi.mock("@/app/radio-actions", () => ({
  createRadioEpisodeAction: vi.fn(),
  updateRadioEpisodeAction: vi.fn(),
  saveRadioEntryAction: vi.fn(),
  deleteRadioEntryAction: vi.fn(),
  setRadioEpisodePublishedAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ children, href, ...props }: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>) => createElement("a", { ...props, href }, children),
  };
});

import RadioPage from "@/app/radio/page";
import RadioEpisodePage from "@/app/radio/[episodeId]/page";
import RadioEntryPage from "@/app/radio/[episodeId]/[entryId]/page";
import HostRadioPage from "@/app/host/radio/page";
import HostRadioEpisodePage from "@/app/host/radio/[id]/page";
import HostRadioEntryPage from "@/app/host/radio/[id]/entries/[entryId]/page";

const publishedAt = new Date("2026-09-16T08:00:00.000Z");
const episode: RadioEpisode = {
  id: "10000000-0000-4000-8000-000000000001",
  hostUserId: "20000000-0000-4000-8000-000000000002",
  episodeNumber: 1,
  title: "那些平凡日子里的小小勇气",
  publishedAt,
  createdAt: publishedAt,
  updatedAt: publishedAt,
};
const entries: RadioEntry[] = [
  {
    id: "30000000-0000-4000-8000-000000000001", episodeId: episode.id, kind: "story", position: 1,
    title: "开往春天的末班车", content: "第一篇独有正文：她在站台等来了久违的春天。", createdAt: publishedAt, updatedAt: publishedAt,
  },
  {
    id: "30000000-0000-4000-8000-000000000002", episodeId: episode.id, kind: "submission", position: 2,
    title: "观众来信：谢谢你为我留了一盏灯",
    content: "第二篇独有正文：那天回家的时候，巷口的灯还亮着。\n\n我曾以为，勇气是一件很遥远的事。后来才发现，有人愿意听我说完，就足够让明天变得不一样。\n\n于是我也想把这份温柔，传给下一个经过的人。",
    createdAt: publishedAt, updatedAt: publishedAt,
  },
  {
    id: "30000000-0000-4000-8000-000000000003", episodeId: episode.id, kind: "story", position: 3,
    title: "把明天写在信的末尾", content: "第三篇独有正文：信纸的最后一行写着明天见。", createdAt: publishedAt, updatedAt: publishedAt,
  },
];

function optionalVisualFixture(name: string, html: string) {
  if (process.env.RADIO_RENDER_FIXTURES !== "1") return;
  const directory = path.resolve("artifacts/ui-review/radio");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, name), html, "utf8");
}

beforeEach(() => {
  vi.resetAllMocks();
  notFoundMock.mockImplementation(() => { throw new Error("NEXT_NOT_FOUND"); });
  episodesMock.mockResolvedValue([episode]);
  // Full entries deliberately include body text: even if a service response grows,
  // the directory must continue to render titles alone.
  episodeMock.mockResolvedValue({ episode, entries });
  entryMock.mockResolvedValue({ episode, entry: entries[1], entries });
});

describe("电台逐层阅读", () => {
  it("电台首页只展示每期主题，不读取或展开目录与正文", async () => {
    const secondEpisode = { ...episode, id: "10000000-0000-4000-8000-000000000002", episodeNumber: 2, title: "在晚风里，听见你的故事" };
    episodesMock.mockResolvedValue([{ ...secondEpisode, entries }, { ...episode, entries }]);

    const html = renderToStaticMarkup(await RadioPage());

    expect(html).toContain(`<h2>${episode.title}</h2>`);
    expect(html).toContain(`<h2>${secondEpisode.title}</h2>`);
    expect(html).toContain(`href="/radio/${episode.id}"`);
    expect(html).toContain(`href="/radio/${secondEpisode.id}"`);
    for (const entry of entries) {
      expect(html).not.toContain(entry.title);
      expect(html).not.toContain(entry.content.split("：")[0]);
      expect(html).not.toContain(`/radio/${episode.id}/${entry.id}`);
    }
    expect(episodeMock).not.toHaveBeenCalled();
    expect(entryMock).not.toHaveBeenCalled();
    optionalVisualFixture("01-themes.html", html);
  });

  it("点击主题后只展示本期目录，并链接到各篇详情", async () => {
    const html = renderToStaticMarkup(await RadioEpisodePage({ params: Promise.resolve({ episodeId: episode.id }) }));

    expect(episodeMock).toHaveBeenCalledExactlyOnceWith(episode.id);
    expect(html).toContain(`<h1>${episode.title}</h1>`);
    expect(html).toContain("观众投稿");
    for (const entry of entries) {
      expect(html).toContain(`<h2>${entry.title}</h2>`);
      expect(html).toContain(`href="/radio/${episode.id}/${entry.id}"`);
      expect(html).not.toContain(entry.content.split("：")[0]);
    }
    expect(entryMock).not.toHaveBeenCalled();
    optionalVisualFixture("02-directory.html", html);
  });

  it("详情仅展开所选正文，保留段落并提供前后篇与目录导航", async () => {
    const selected = entries[1];
    const html = renderToStaticMarkup(await RadioEntryPage({ params: Promise.resolve({ episodeId: episode.id, entryId: selected.id }) }));
    const article = html.match(/<article\b[\s\S]*?<\/article>/)?.[0];

    expect(entryMock).toHaveBeenCalledExactlyOnceWith(episode.id, selected.id);
    expect(article).toContain(`<h1>${selected.title}</h1>`);
    expect(article).toContain(selected.content);
    expect(article).toContain("观众投稿");
    for (const other of [entries[0], entries[2]]) {
      expect(article).not.toContain(other.title);
      expect(html).not.toContain(other.content.split("：")[0]);
    }
    const links = html.match(/<a\b[^>]*>/g) ?? [];
    expect(links.find((link) => link.includes('rel="prev"'))).toContain(`href="/radio/${episode.id}/${entries[0].id}"`);
    expect(links.find((link) => link.includes('rel="next"'))).toContain(`href="/radio/${episode.id}/${entries[2].id}"`);
    expect(html).toContain(`href="/radio/${episode.id}"`);
    expect(html).toContain("返回本期目录");
    optionalVisualFixture("03-story.html", html);

    if (process.env.RADIO_RENDER_FIXTURES === "1") {
      for (const [index, entry] of entries.entries()) {
        entryMock.mockResolvedValue({ episode, entry, entries });
        const page = await RadioEntryPage({ params: Promise.resolve({ episodeId: episode.id, entryId: entry.id }) });
        optionalVisualFixture(`03-story-${index + 1}.html`, renderToStaticMarkup(page));
      }
      hostEpisodesMock.mockResolvedValue([episode, { ...episode, id: "10000000-0000-4000-8000-000000000002", episodeNumber: 2, title: "在晚风里，听见你的故事", publishedAt: null }]);
      hostEpisodeMock.mockResolvedValue({ episode, entries });
      optionalVisualFixture("04-host-themes.html", renderToStaticMarkup(await HostRadioPage({ searchParams: Promise.resolve({}) })));
      optionalVisualFixture("05-host-directory.html", renderToStaticMarkup(await HostRadioEpisodePage({ params: Promise.resolve({ id: episode.id }), searchParams: Promise.resolve({}) })));
      optionalVisualFixture("06-host-editor.html", renderToStaticMarkup(await HostRadioEntryPage({ params: Promise.resolve({ id: episode.id, entryId: selected.id }) })));
    }
  });

  it.each([
    { index: 0, available: "next", absent: "prev" },
    { index: 2, available: "prev", absent: "next" },
  ])("第 $index 篇只展示实际存在的相邻篇目", async ({ index, available, absent }) => {
    const selected = entries[index];
    entryMock.mockResolvedValue({ episode, entry: selected, entries });

    const html = renderToStaticMarkup(await RadioEntryPage({ params: Promise.resolve({ episodeId: episode.id, entryId: selected.id }) }));

    expect(html).toContain(`rel="${available}"`);
    expect(html).not.toContain(`rel="${absent}"`);
  });

  it("没有已发布期数时显示等待内容的空状态", async () => {
    episodesMock.mockResolvedValue([]);

    const html = renderToStaticMarkup(await RadioPage());

    expect(html).toContain("故事还在路上");
    expect(html).not.toContain("radio-list-link");
    expect(html).not.toContain(episode.title);
  });
});

describe("隐藏或不存在的电台内容", () => {
  it("主题服务对缺失或未公开的期数返回 null 时显示 404", async () => {
    episodeMock.mockResolvedValue(null);

    await expect(RadioEpisodePage({ params: Promise.resolve({ episodeId: episode.id }) })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledOnce();
    expect(entryMock).not.toHaveBeenCalled();
  });

  it("正文服务对缺失、不属于本期或未公开的篇目返回 null 时显示 404", async () => {
    entryMock.mockResolvedValue(null);

    await expect(RadioEntryPage({ params: Promise.resolve({ episodeId: episode.id, entryId: entries[1].id }) })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledOnce();
  });
});
