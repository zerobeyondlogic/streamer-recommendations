import { createHash, randomBytes } from "node:crypto";

export function normalizeUsername(value: string) { return value.normalize("NFKC").toLocaleLowerCase("zh-CN"); }
export function normalizeTitle(value: string) { return value.normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/\s+/g, " ").trim(); }
export function createSessionToken() { return randomBytes(32).toString("base64url"); }
export function sha256(value: string | Buffer) { return createHash("sha256").update(value).digest("hex"); }
export function safeSpreadsheetCell(value: unknown) {
  if (typeof value !== "string") return value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
export function isSameOrigin(origin: string | null, host: string | null) {
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
export function publicSubmitter(anonymous: boolean, username: string) { return anonymous ? "匿名观众" : username; }

export function safePageNumber(value: unknown, max = 500) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(max, Math.max(1, Math.trunc(numeric)));
}

export function safeLocalPath(value: string, fallback = "/") {
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, "https://local.invalid");
    return parsed.origin === "https://local.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export function isAllowedBackgroundUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export const isAllowedSiteIconUrl = isAllowedBackgroundUrl;
