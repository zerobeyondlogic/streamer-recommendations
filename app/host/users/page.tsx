import type { Metadata } from "next";
import { Check, Clock3, UserRoundCheck, UsersRound } from "lucide-react";
import { approveBilibiliUserAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { ResetUserPassword } from "@/components/reset-user-password";
import { StyledSelect } from "@/components/styled-select";
import { getManagedUsers } from "@/lib/data";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "用户管理" };

export default async function HostUsersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const status = ["pending", "active", "banned"].includes(params.status ?? "") ? params.status as "pending" | "active" | "banned" : undefined;
  const data = await getManagedUsers({ status, q: params.q });
  return <>
    <header className="host-heading"><div><span className="eyebrow">User management</span><h1>用户管理</h1><p>核验 UID，查看账号并处理密码重置。</p></div></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    <div className="stats-grid user-stats"><article className="stat-card"><span><UsersRound aria-hidden="true"/></span><strong>{data.total}</strong><small>已注册用户</small></article><article className="stat-card"><span><UserRoundCheck aria-hidden="true"/></span><strong>{data.active}</strong><small>已启用</small></article><article className="stat-card"><span><Clock3 aria-hidden="true"/></span><strong>{data.pending}</strong><small>待核验</small></article></div>
    <form className="filters user-filters"><label>搜索用户<input name="q" defaultValue={params.q} placeholder="用户名…"/></label><StyledSelect name="status" label="账号状态" defaultValue={status ?? ""} options={[{value:"",label:"全部状态"},{value:"pending",label:"待核验"},{value:"active",label:"已启用"},{value:"banned",label:"已停用"}]}/><button className="button small primary">筛选</button></form>
    <div className="host-list user-manager-list">{data.items.map((user) => <article className="panel managed-user-card" key={user.id}>
      <div className="managed-user-main"><div className="card-top"><span className={`user-status user-status-${user.status}`}>{user.status === "active" ? "已启用" : user.status === "pending" ? "待核验" : "已停用"}</span>{user.role === "host" ? <span className="host-badge">主播</span> : null}</div><h2>{user.username}</h2><div className="record-meta"><span>UID：{user.bilibiliUid ?? "未绑定"}</span><span>注册于 {formatDate(user.createdAt)}</span></div>{user.status === "pending" && user.verificationCode ? <code className="managed-verification-code">{user.verificationCode}</code> : null}</div>
      <div className="managed-user-actions">{user.status === "pending" ? <><a className="button small ghost" href={`https://space.bilibili.com/${user.bilibiliUid}`} target="_blank" rel="noopener noreferrer">打开 B 站空间 ↗</a><form action={approveBilibiliUserAction}><input type="hidden" name="userId" value={user.id}/><button className="button small primary" type="submit">批准账号</button></form></> : null}{user.status === "active" && user.role === "user" ? <ResetUserPassword userId={user.id} username={user.username}/> : null}</div>
    </article>)}</div>
    {!data.items.length ? <div className="empty-state"><Check aria-hidden="true"/><h3>没有符合条件的用户</h3></div> : null}
  </>;
}
