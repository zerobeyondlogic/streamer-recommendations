import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { changeOneTimePasswordAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "设置新密码" };

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/");
  return <div className="form-page"><header className="form-header"><span className="eyebrow">Password reset</span><h1>设置新密码</h1><p>一次性密码已经失效，请设置你自己的密码。</p></header><form className="panel stack" action={changeOneTimePasswordAction}><Notice>{params.error}</Notice><label>新密码<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required autoFocus/><span className="helper">至少 8 位。</span></label><label>再次输入<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label><button className="button primary" type="submit">保存新密码</button></form></div>;
}
