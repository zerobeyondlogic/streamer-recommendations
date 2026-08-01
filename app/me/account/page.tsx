import type { Metadata } from "next";
import { KeyRound, UserRoundPen } from "lucide-react";
import { updateAccountPasswordAction, updateAccountUsernameAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "账号设置" };

export default async function AccountSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  return <div className="form-page wide account-settings-page">
    <header className="form-header"><span className="eyebrow">账号</span><h1>账号设置</h1><p>修改用户名或登录密码。</p></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    <div className="account-settings-grid">
      <form className="panel stack" action={updateAccountUsernameAction}>
        <div className="settings-card-heading"><span><UserRoundPen aria-hidden="true"/></span><div><h2>用户名</h2><p>修改后会同步到你的投稿和评论。</p></div></div>
        <label>新用户名<input name="username" defaultValue={user.username} minLength={2} maxLength={32} autoComplete="username" required/></label>
        <label>当前密码<input name="currentPassword" type="password" minLength={8} maxLength={128} autoComplete="current-password" required/></label>
        <button className="button primary" type="submit">保存用户名</button>
      </form>
      <form className="panel stack" action={updateAccountPasswordAction}>
        <div className="settings-card-heading"><span><KeyRound aria-hidden="true"/></span><div><h2>登录密码</h2><p>保存后需要在所有设备重新登录。</p></div></div>
        <label>当前密码<input name="currentPassword" type="password" minLength={8} maxLength={128} autoComplete="current-password" required/></label>
        <label>新密码<input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label>
        <label>再次输入新密码<input name="confirmPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label>
        <button className="button primary" type="submit">修改密码</button>
      </form>
    </div>
  </div>;
}
