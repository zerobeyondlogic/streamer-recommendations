"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHost } from "@/lib/auth";
import { createRadioEpisode, deleteRadioEntry, RadioError, saveRadioEntry, setRadioEpisodePublished, updateRadioEpisode } from "@/lib/radio";
import { radioEntrySchema, radioEpisodeSchema, radioIdSchema } from "@/lib/radio-validation";
import { isSameOrigin } from "@/lib/security";

function value(form: FormData, key: string) { return String(form.get(key) ?? ""); }
function go(path: string, message: string, type: "error" | "success" = "error"): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}
async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && !isSameOrigin(origin, h.get("host"))) throw new Error("来源校验失败");
}
function episodeId(form: FormData) {
  const parsed = radioIdSchema.safeParse(value(form, "episodeId"));
  if (!parsed.success) go("/host/radio", "期数编号无效");
  return parsed.data;
}
function revalidateRadio(id?: string) {
  revalidatePath("/radio");
  revalidatePath("/host/radio");
  if (id) {
    revalidatePath(`/radio/${id}`);
    revalidatePath("/radio/[episodeId]/[entryId]", "page");
    revalidatePath(`/host/radio/${id}`);
    revalidatePath("/host/radio/[id]/entries/[entryId]", "page");
  }
}
function redirectError(error: unknown, path: string): never {
  if (error instanceof RadioError) go(path, error.message);
  throw error;
}

export async function createRadioEpisodeAction(form: FormData) {
  await assertSameOrigin();
  const host = await requireHost();
  const parsed = radioEpisodeSchema.safeParse({ episodeNumber: value(form, "episodeNumber"), title: value(form, "title") });
  if (!parsed.success) go("/host/radio", parsed.error.issues[0].message);
  let id: string;
  try { id = await createRadioEpisode(host.id, parsed.data); }
  catch (error) { redirectError(error, "/host/radio"); }
  revalidateRadio();
  go(`/host/radio/${id}`, "新的一期已保存为草稿，可以添加篇目了", "success");
}

export async function updateRadioEpisodeAction(form: FormData) {
  await assertSameOrigin();
  const host = await requireHost();
  const id = episodeId(form);
  const path = `/host/radio/${id}`;
  const parsed = radioEpisodeSchema.safeParse({ episodeNumber: value(form, "episodeNumber"), title: value(form, "title") });
  if (!parsed.success) go(path, parsed.error.issues[0].message);
  try { await updateRadioEpisode(host.id, id, parsed.data); }
  catch (error) { redirectError(error, path); }
  revalidateRadio(id);
  go(path, "本期主题已保存", "success");
}

export async function saveRadioEntryAction(_previousState: { error?: string }, form: FormData): Promise<{ error?: string }> {
  await assertSameOrigin();
  const host = await requireHost();
  const id = value(form, "episodeId");
  const entryId = value(form, "entryId") || null;
  if (!radioIdSchema.safeParse(id).success || (entryId && !radioIdSchema.safeParse(entryId).success)) return { error: "内容编号无效，请返回本期目录重试" };
  const parsed = radioEntrySchema.safeParse({ title: value(form, "title"), content: value(form, "content"), kind: value(form, "kind"), position: value(form, "position") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try { await saveRadioEntry(host.id, id, entryId, parsed.data); }
  catch (error) {
    if (error instanceof RadioError) return { error: error.message };
    throw error;
  }
  revalidateRadio(id);
  go(`/host/radio/${id}`, "篇目已保存", "success");
}

export async function deleteRadioEntryAction(form: FormData) {
  await assertSameOrigin();
  const host = await requireHost();
  const id = episodeId(form);
  const path = `/host/radio/${id}`;
  const entryId = value(form, "entryId");
  if (!radioIdSchema.safeParse(entryId).success) go(path, "篇目编号无效");
  try { await deleteRadioEntry(host.id, id, entryId); }
  catch (error) { redirectError(error, path); }
  revalidateRadio(id);
  go(path, "篇目已删除", "success");
}

export async function setRadioEpisodePublishedAction(form: FormData) {
  await assertSameOrigin();
  const host = await requireHost();
  const id = episodeId(form);
  const path = `/host/radio/${id}`;
  const published = value(form, "published");
  if (published !== "true" && published !== "false") go(path, "发布状态无效");
  try { await setRadioEpisodePublished(host.id, id, published === "true"); }
  catch (error) { redirectError(error, path); }
  revalidateRadio(id);
  go(path, published === "true" ? "本期已发布，读者可以从小羊入口阅读了" : "本期已撤回为草稿", "success");
}
