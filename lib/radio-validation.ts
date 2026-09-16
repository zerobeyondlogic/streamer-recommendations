import { z } from "zod";

const integerField = (minimum: number, label: string) => z.union([
  z.number(),
  z.string().trim().regex(/^\d+$/, `请填写${label}`).transform(Number),
]).pipe(z.number().int(`${label}必须是整数`).min(minimum, `${label}不能小于 ${minimum}`).max(2147483647, `${label}过大`));

export const radioIdSchema = z.uuid("内容编号无效");

export const radioEpisodeSchema = z.object({
  episodeNumber: integerField(1, "期数"),
  title: z.string().trim().min(1, "请填写本期主题").max(120, "主题最多 120 字"),
});

export const radioEntrySchema = z.object({
  title: z.string().trim().min(1, "请填写篇目标题").max(160, "篇目标题最多 160 字"),
  content: z.string().trim().min(1, "请填写正文").max(50000, "正文最多 50000 字"),
  kind: z.enum(["story", "submission"], { error: "请选择故事或观众投稿" }),
  position: integerField(0, "排序序号"),
});

export type RadioEpisodeInput = z.infer<typeof radioEpisodeSchema>;
export type RadioEntryInput = z.infer<typeof radioEntrySchema>;
