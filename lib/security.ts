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
