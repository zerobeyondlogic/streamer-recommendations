import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, KeyRound, Pencil, ShieldCheck, UserRound, UserRoundPen } from "lucide-react";
import { updateAccountUsernameAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "账号设置" };

export default async function AccountSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  return <div className="form-page wide account-settings-page">
    <header className="form-header"><span className="eyebrow">账号</span><h1>账号设置</h1></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    <section className="panel account-profile-card">
      <div className="account-profile-avatar"><UserRound aria-hidden="true"/></div>
      <div className="account-profile-main"><span>用户名</span><h2>{user.username}</h2><small>{user.role === "host" ? "主播账号" : "观众账号"}</small></div>
      <dl className="account-profile-meta">
        <div><dt><ShieldCheck aria-hidden="true"/>B 站 UID</dt><dd>{user.bilibiliUid ?? "未绑定"}</dd></div>
        <div><dt><CalendarDays aria-hidden="true"/>创建时间</dt><dd>{formatDate(user.createdAt)}</dd></div>
      </dl>
    </section>
    <div className="account-action-list">
      <details className="panel account-edit-disclosure">
        <summary><span><UserRoundPen aria-hidden="true"/></span><span><strong>用户名</strong><small>{user.username}</small></span><b><Pencil aria-hidden="true"/>修改用户名</b></summary>
        <form className="stack account-inline-form" action={updateAccountUsernameAction}>
          <label>新用户名<input name="username" defaultValue={user.username} minLength={2} maxLength={32} autoComplete="username" required/></label>
          <label>当前密码<input name="currentPassword" type="password" minLength={8} maxLength={128} autoComplete="current-password" required/></label>
          <button className="button primary" type="submit">保存用户名</button>
        </form>
      </details>
      <Link className="panel account-setting-link" href="/me/account/password"><span><KeyRound aria-hidden="true"/></span><span><strong>登录密码</strong><small>••••••••</small></span><b>修改密码</b></Link>
    </div>
  </div>;
}
