import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/app/actions";
import { Notice } from "@/components/notice";
export const metadata: Metadata = { title: "注册" };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <div className="form-page"><header className="form-header"><span className="eyebrow">加入小社区</span><h1>创建你的观众账号</h1><p>用户名会用于展示；匿名投稿时，公开页面只显示“匿名观众”。</p></header><form className="panel stack" action={registerAction}><Notice>{error}</Notice><label>用户名<input name="username" autoComplete="username" minLength={2} maxLength={32} pattern="[\p{L}\p{N}_-]+" required autoFocus /><span className="helper">2～32 个字符，可使用文字、数字、下划线和短横线；不区分大小写。</span></label><label>密码<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /><span className="helper">至少 8 位，请使用独特且不易猜的密码。</span></label><button className="button primary" type="submit">创建账号</button></form><p className="auth-switch">已有账号？ <Link href="/login">直接登录</Link></p></div>;
}
