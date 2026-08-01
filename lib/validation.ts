import { z } from "zod";
import { categories, contentStatuses } from "./config";
import { isAllowedBackgroundUrl } from "./security";
import { hasBalancedSpoilers } from "./spoilers";
import { builtInThemeValues } from "./themes";

const text = (max: number) => z.string().trim().max(max);
export const usernameSchema = z.string().trim().min(2, "用户名至少 2 个字符").max(32, "用户名最多 32 个字符").regex(/^[\p{L}\p{N}_-]+$/u, "用户名只能包含文字、数字、下划线和短横线");
export const passwordSchema = z.string().min(8, "密码至少 8 位").max(128, "密码最多 128 位");
export const bilibiliUidSchema = z.string().trim().regex(/^[1-9]\d{0,19}$/, "请输入正确的 B 站数字 UID");
export const authSchema = z.object({ username: usernameSchema, password: passwordSchema });
export const registrationSchema = authSchema.extend({ bilibiliUid: bilibiliUidSchema });
export const changePasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { message: "两次输入的密码不一致", path: ["confirmPassword"] });

export const accountUsernameSchema = z.object({
  username: usernameSchema,
  currentPassword: passwordSchema,
});

export const accountPasswordSchema = z.object({
  currentPassword: passwordSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { message: "两次输入的新密码不一致", path: ["confirmPassword"] })
  .refine((value) => value.password !== value.currentPassword, { message: "新密码不能与当前密码相同", path: ["password"] });

export const submissionSchema = z.object({
  category: z.enum(categories),
  title: text(100).min(1, "请填写名称或标题"),
  description: text(1000).optional().transform((value) => value || null),
  externalUrl: z.union([z.literal(""), z.url().refine((value) => /^https?:\/\//i.test(value), "链接只允许 http/https")]).optional().transform((value) => value || null),
  anonymousPublic: z.coerce.boolean().default(false),
});

export const marshmallowSchema = z.object({
  content: text(1000).min(1, "请写下想对神绮爱说的话"),
  allowPublic: z.coerce.boolean().default(false),
});

export const submissionReviewSchema = z.object({
  submissionId: z.uuid(),
  recommend: z.enum(["recommend", "not_recommend"]),
  comment: text(2000).refine(hasBalancedSpoilers, "剧透标记需要成对出现，请检查是否缺少一个 ||").optional().transform((value) => value || null),
});

export const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "请使用 6 位十六进制颜色");
export const themeSchema = z.object({
  backgroundType: z.enum(["built_in", "custom"]),
  backgroundImageUrl: z.union([
    z.literal(""),
    z.enum(builtInThemeValues),
    z.url().refine(isAllowedBackgroundUrl, "自定义背景必须来自本站的 Vercel Blob"),
  ]).optional().transform((v) => v || null),
  primaryColor: colorSchema,
  secondaryColor: colorSchema,
  accentColor: colorSchema,
  backgroundColor: colorSchema,
  backgroundOverlay: z.coerce.number().min(0).max(0.85),
});

export const appearanceSchema = z.object({
  navOpacity: z.coerce.number().min(0.3).max(1),
  heroOpacity: z.coerce.number().min(0.3).max(1),
  filterOpacity: z.coerce.number().min(0.3).max(1),
  cardOpacity: z.coerce.number().min(0.3).max(1),
  ambientTextMist: z.coerce.number().min(0).max(1),
  navBlur: z.coerce.boolean(),
  heroBlur: z.coerce.boolean(),
  filterBlur: z.coerce.boolean(),
  cardBlur: z.coerce.boolean(),
});

export const siteCopySchema = z.object({
  siteName: text(50).min(1), siteTagline: text(120),
  recommendationHeroTitle: text(80).min(1), recommendationHeroAccent: text(80).min(1), recommendationTagline: text(180), recommendationSectionTitle: text(80).min(1),
  foodHeroTitle: text(100).min(1), foodTagline: text(180), foodSectionTitle: text(80).min(1),
  wishHeroTitle: text(100).min(1), wishTagline: text(180), wishSectionTitle: text(80).min(1),
  marshmallowHeroTitle: text(100).min(1), marshmallowTagline: text(180), marshmallowSectionTitle: text(80).min(1),
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
  score: scoreSchema,
  experience: text(4000).optional().transform((value) => value || null),
  pin: z.coerce.boolean().default(false),
  pinNote: text(300).optional().transform((value) => value || null),
});

export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
