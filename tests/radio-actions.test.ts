import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(), requireHost: vi.fn(), redirect: vi.fn(), revalidatePath: vi.fn(),
  createRadioEpisode: vi.fn(), updateRadioEpisode: vi.fn(), saveRadioEntry: vi.fn(),
  deleteRadioEntry: vi.fn(), setRadioEpisodePublished: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requireHost: mocks.requireHost }));
vi.mock("@/lib/radio", () => ({
  RadioError: class RadioError extends Error {},
  createRadioEpisode: mocks.createRadioEpisode, updateRadioEpisode: mocks.updateRadioEpisode,
  saveRadioEntry: mocks.saveRadioEntry, deleteRadioEntry: mocks.deleteRadioEntry,
  setRadioEpisodePublished: mocks.setRadioEpisodePublished,
}));

import { RadioError } from "../lib/radio";
import { createRadioEpisodeAction, deleteRadioEntryAction, saveRadioEntryAction, setRadioEpisodePublishedAction, updateRadioEpisodeAction } from "../app/radio-actions";

const hostId = "10000000-0000-4000-8000-000000000001";
const episodeId = "20000000-0000-4000-8000-000000000002";
const entryId = "30000000-0000-4000-8000-000000000003";
function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ episodeId, entryId, episodeNumber: "1", title: "主题", content: "故事正文", kind: "story", position: "0", published: "true", ...values })) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.headers.mockResolvedValue(new Headers({ origin: "https://radio.example", host: "radio.example" }));
  mocks.requireHost.mockResolvedValue({ id: hostId });
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`REDIRECT:${path}`); });
  mocks.createRadioEpisode.mockResolvedValue(episodeId);
});

describe("电台操作权限和编辑反馈", () => {
  const operations = [
    ["create", () => createRadioEpisodeAction(form())],
    ["update", () => updateRadioEpisodeAction(form())],
    ["save", () => saveRadioEntryAction({}, form())],
    ["delete", () => deleteRadioEntryAction(form())],
    ["publish", () => setRadioEpisodePublishedAction(form())],
  ] as const;

  it.each(operations)("%s 在鉴权和写入前拒绝跨站请求", async (_name, operation) => {
    mocks.headers.mockResolvedValue(new Headers({ origin: "https://wrong.example", host: "radio.example" }));
    await expect(operation()).rejects.toThrow("来源校验失败");
    expect(mocks.requireHost).not.toHaveBeenCalled();
    expect(mocks.createRadioEpisode).not.toHaveBeenCalled();
    expect(mocks.updateRadioEpisode).not.toHaveBeenCalled();
    expect(mocks.saveRadioEntry).not.toHaveBeenCalled();
    expect(mocks.deleteRadioEntry).not.toHaveBeenCalled();
    expect(mocks.setRadioEpisodePublished).not.toHaveBeenCalled();
  });

  it.each(operations)("%s 必须通过主播会话鉴权", async (_name, operation) => {
    mocks.requireHost.mockRejectedValue(new Error("LOGIN_REQUIRED"));
    await expect(operation()).rejects.toThrow("LOGIN_REQUIRED");
    expect(mocks.createRadioEpisode).not.toHaveBeenCalled();
    expect(mocks.updateRadioEpisode).not.toHaveBeenCalled();
    expect(mocks.saveRadioEntry).not.toHaveBeenCalled();
    expect(mocks.deleteRadioEntry).not.toHaveBeenCalled();
    expect(mocks.setRadioEpisodePublished).not.toHaveBeenCalled();
  });

  it("长篇验证失败返回状态、不跳走或写入，编辑器可保留正文", async () => {
    expect(await saveRadioEntryAction({}, form({ title: " " }))).toEqual({ error: "请填写篇目标题" });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.saveRadioEntry).not.toHaveBeenCalled();
  });

  it("保存失败返回可展示错误，正文无需放进 URL", async () => {
    mocks.saveRadioEntry.mockRejectedValue(new RadioError("电台尚未初始化"));
    expect(await saveRadioEntryAction({}, form())).toEqual({ error: "电台尚未初始化" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("有效内容保存后返回本期目录并使页面缓存失效", async () => {
    await expect(saveRadioEntryAction({}, form({ entryId: "", kind: "submission" }))).rejects.toThrow(`REDIRECT:/host/radio/${episodeId}?success=`);
    expect(mocks.saveRadioEntry).toHaveBeenCalledWith(hostId, episodeId, null, { title: "主题", content: "故事正文", kind: "submission", position: 0 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/radio");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/radio/${episodeId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/radio/[episodeId]/[entryId]", "page");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/host/radio/${episodeId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/host/radio/[id]/entries/[entryId]", "page");
  });

  it("发布状态严格解析，字符串 false 确实撤回发布", async () => {
    await expect(setRadioEpisodePublishedAction(form({ published: "false" }))).rejects.toThrow("REDIRECT:");
    expect(mocks.setRadioEpisodePublished).toHaveBeenCalledWith(hostId, episodeId, false);
    mocks.setRadioEpisodePublished.mockClear();
    await expect(setRadioEpisodePublishedAction(form({ published: "unexpected" }))).rejects.toThrow("?error=");
    expect(mocks.setRadioEpisodePublished).not.toHaveBeenCalled();
  });

  it("非法 ID 不会拼接为跳转路径或传给数据库", async () => {
    await expect(updateRadioEpisodeAction(form({ episodeId: "../../login" }))).rejects.toThrow("REDIRECT:/host/radio?error=");
    expect(mocks.updateRadioEpisode).not.toHaveBeenCalled();
  });
});
