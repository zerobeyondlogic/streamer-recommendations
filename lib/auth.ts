import "server-only";
import { compare, hash } from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { SESSION_DAYS } from "./config";
import { createSessionToken, normalizeUsername, sha256 } from "./security";
import { authSchema, registrationSchema } from "./validation";

const COOKIE_NAME = "sr_session";
export type SafeUser = Pick<User, "id" | "username" | "role" | "status">;

async function setSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await getDb().insert(sessions).values({ userId, tokenHash: sha256(token), expiresAt });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export async function register(username: string, password: string, bilibiliUid: string) {
  const parsed = registrationSchema.safeParse({ username, password, bilibiliUid });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "输入有误" };
  const normalized = normalizeUsername(parsed.data.username);
  const existing = await getDb().select({ id: users.id }).from(users).where(eq(users.usernameNormalized, normalized)).limit(1);
  if (existing.length) return { ok: false as const, error: "这个用户名已经被使用" };
  const passwordHash = await hash(parsed.data.password, 12);
  const verificationCode = `SR-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  try {
    await getDb().insert(users).values({
      username: parsed.data.username,
      usernameNormalized: normalized,
      passwordHash,
      status: "pending",
      bilibiliUid: parsed.data.bilibiliUid,
      bilibiliVerificationCode: verificationCode,
    });
    return { ok: true as const, bilibiliUid: parsed.data.bilibiliUid, verificationCode };
  } catch (error) {
    if (String(error).includes("username_normalized")) return { ok: false as const, error: "这个用户名已经被使用" };
    if (String(error).includes("bilibili_uid")) return { ok: false as const, error: "这个 B 站 UID 已绑定其他账号" };
    throw error;
  }
}

export async function login(username: string, password: string) {
  const parsed = authSchema.safeParse({ username, password });
  if (!parsed.success) return { ok: false as const, error: "用户名或密码错误" };
  const [user] = await getDb().select().from(users).where(eq(users.usernameNormalized, normalizeUsername(parsed.data.username))).limit(1);
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    return { ok: false as const, error: "用户名或密码错误" };
  }
  if (user.status === "pending") return { ok: false as const, error: "B 站 UID 还在等待主播核验，请先完成主页签名验证" };
  if (user.status !== "active") return { ok: false as const, error: "用户名或密码错误" };
  await setSession(user.id);
  return { ok: true as const };
}

export async function logout() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  (await cookies()).delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const [row] = await getDb().select({ id: users.id, username: users.username, role: users.role, status: users.status })
      .from(sessions).innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date()), eq(users.status, "active"))).limit(1);
    return row ?? null;
  } catch (error) {
    if (String(error).includes("DATABASE_URL_MISSING")) return null;
    throw error;
  }
}

export async function requireUser() { const user = await getCurrentUser(); if (!user) redirect("/login"); return user; }
export async function requireHost() { const user = await requireUser(); if (user.role !== "host") redirect("/"); return user; }
export async function verifyPassword(userId: string, password: string) {
  const [user] = await getDb().select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  return !!user && compare(password, user.hash);
}
