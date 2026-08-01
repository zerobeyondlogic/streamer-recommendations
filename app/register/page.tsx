import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/app/actions";
import { Notice } from "@/components/notice";
export const metadata: Metadata = { title: "注册" };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <div className="form-page"><header className="form-header"><span className="eyebrow">注册</span><h1>创建观众账号</h1><p>绑定 B 站 UID，并用主页签名核验。</p></header><form className="panel stack" action={registerAction}><Notice>{error}</Notice><label>用户名<input name="username" autoComplete="username" minLength={2} maxLength={32} pattern="[\p{L}\p{N}_-]+" required autoFocus /><span className="helper">2～32 个文字、数字、_ 或 -。</span></label><label>B 站 UID<input name="bilibiliUid" inputMode="numeric" pattern="[1-9][0-9]{0,19}" maxLength={20} placeholder="例如：12345678" required /><span className="helper">个人空间网址末尾的数字。</span></label><label>密码<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /><span className="helper">至少 8 位。</span></label><button className="button primary" type="submit">获取验证码</button></form><p className="auth-switch">已有账号？ <Link href="/login">登录</Link></p></div>;
}
