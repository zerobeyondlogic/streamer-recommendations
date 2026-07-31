import { z } from "zod";
import { categories, contentStatuses } from "./config";

const text = (max: number) => z.string().trim().max(max);
export const usernameSchema = z.string().trim().min(2, "用户名至少 2 个字符").max(32, "用户名最多 32 个字符").regex(/^[\p{L}\p{N}_-]+$/u, "用户名只能包含文字、数字、下划线和短横线");
export const passwordSchema = z.string().min(8, "密码至少 8 位").max(128, "密码最多 128 位");
export const bilibiliUidSchema = z.string().trim().regex(/^[1-9]\d{0,19}$/, "请输入正确的 B 站数字 UID");
export const authSchema = z.object({ username: usernameSchema, password: passwordSchema });
export const registrationSchema = authSchema.extend({ bilibiliUid: bilibiliUidSchema });

export const submissionSchema = z.object({
  category: z.enum(categories),
  title: text(100).min(1, "请填写作品名称"),
  description: text(1000).optional().transform((value) => value || null),
  externalUrl: z.union([z.literal(""), z.url().refine((value) => /^https?:\/\//i.test(value), "链接只允许 http/https")]).optional().transform((value) => value || null),
  anonymousPublic: z.coerce.boolean().default(false),
});

export const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "请使用 6 位十六进制颜色");
export const themeSchema = z.object({
  siteName: text(50).min(1),
  siteTagline: text(120),
  backgroundType: z.enum(["built_in", "custom"]),
  backgroundImageUrl: z.union([z.literal(""), z.enum(["builtin:warm", "builtin:stars", "builtin:bubbles"]), z.url()]).optional().transform((v) => v || null),
  primaryColor: colorSchema,
  secondaryColor: colorSchema,
  accentColor: colorSchema,
  backgroundColor: colorSchema,
  cardOpacity: z.coerce.number().min(0.7).max(1),
  backgroundOverlay: z.coerce.number().min(0).max(0.85),
});

export const hostUpdateSchema = z.object({
  submissionId: z.uuid(),
  contentStatus: z.enum(contentStatuses).optional(),
  pinNote: text(300).optional(),
  reply: text(4000).optional(),
  republish: z.coerce.boolean().optional(),
  notifyAgain: z.coerce.boolean().optional(),
});

export const scoreSchema = z.union([z.literal(""), z.coerce.number().int().min(1).max(10)]).transform((value) => value === "" ? null : value);

export const hostRecommendationSchema = submissionSchema.omit({ anonymousPublic: true }).extend({
  contentStatus: z.enum(contentStatuses),
  score: scoreSchema,
  experience: text(4000).optional().transform((value) => value || null),
  pin: z.coerce.boolean().default(false),
  pinNote: text(300).optional().transform((value) => value || null),
}).superRefine((value, context) => {
  if (value.score !== null && value.contentStatus !== "completed") context.addIssue({ code: "custom", path: ["score"], message: "只有已完成的作品才能评分" });
});

export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
