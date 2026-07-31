import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions";
import { Notice } from "@/components/notice";
export const metadata: Metadata = { title: "登录" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <div className="form-page"><header className="form-header"><span className="eyebrow">欢迎回来</span><h1>继续逛好作品</h1><p>新账号需先完成 B 站 UID 核验，之后用本站用户名和密码登录。</p></header><form className="panel stack" action={loginAction}><Notice>{error}</Notice><label>用户名<input name="username" autoComplete="username" minLength={2} maxLength={32} required autoFocus /></label><label>密码<input name="password" type="password" autoComplete="current-password" minLength={8} maxLength={128} required /></label><button className="button primary" type="submit">登录</button></form><p className="auth-switch">还没有账号？ <Link href="/register">注册并绑定 UID</Link></p></div>;
}
