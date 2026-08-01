import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { updateAccountPasswordAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "修改密码" };

export default async function AccountPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [, params] = await Promise.all([requireUser(), searchParams]);
  return <div className="form-page account-password-page">
    <Link className="back-link" href="/me/account"><ArrowLeft aria-hidden="true"/>返回账号设置</Link>
    <header className="form-header"><span className="account-page-icon"><KeyRound aria-hidden="true"/></span><span className="eyebrow">账号安全</span><h1>修改密码</h1><p>保存后，其他设备需要重新登录。</p></header>
    <form className="panel stack" action={updateAccountPasswordAction}>
      <Notice>{params.error}</Notice>
      <input name="returnTo" type="hidden" value="/me/account/password"/>
      <label>当前密码<input name="currentPassword" type="password" minLength={8} maxLength={128} autoComplete="current-password" required autoFocus/></label>
      <label>新密码<input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label>
      <label>再次输入新密码<input name="confirmPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label>
      <button className="button primary" type="submit">保存新密码</button>
    </form>
  </div>;
}
