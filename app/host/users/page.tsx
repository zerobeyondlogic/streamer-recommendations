import type { Metadata } from "next";
import { Check, Clock3, ShieldOff, UserRoundCheck, UsersRound } from "lucide-react";
import { approveBilibiliUserAction, deleteManagedUserAction, managedUserStatusAction } from "@/app/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { ResetUserPassword } from "@/components/reset-user-password";
import { StyledSelect } from "@/components/styled-select";
import { getManagedUsers, type ManagedUserStatus } from "@/lib/data";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "用户管理" };

export default async function HostUsersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const status = ["pending", "active", "banned", "deleted"].includes(params.status ?? "") ? params.status as ManagedUserStatus : undefined;
  const data = await getManagedUsers({ status, q: params.q });
  return <>
    <header className="host-heading"><div><span className="eyebrow">用户</span><h1>用户管理</h1><p>核验、停用、删除账号或协助重置密码。</p></div></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    <div className="stats-grid user-stats"><article className="stat-card"><span><UsersRound aria-hidden="true"/></span><strong>{data.total}</strong><small>现有注册用户</small></article><article className="stat-card"><span><UserRoundCheck aria-hidden="true"/></span><strong>{data.active}</strong><small>已启用</small></article><article className="stat-card"><span><Clock3 aria-hidden="true"/></span><strong>{data.pending}</strong><small>待核验</small></article><article className="stat-card"><span><ShieldOff aria-hidden="true"/></span><strong>{data.banned}</strong><small>已停用</small></article></div>
    <form className="filters user-filters"><label>搜索用户<input name="q" defaultValue={params.q} placeholder="用户名…"/></label><StyledSelect name="status" label="账号状态" defaultValue={status ?? ""} options={[{value:"",label:"全部状态"},{value:"pending",label:"待核验"},{value:"active",label:"已启用"},{value:"banned",label:"已停用"},{value:"deleted",label:"已删除"}]}/><button className="button small primary">筛选</button></form>
    <div className="host-list user-manager-list">{data.items.map((user) => <article className="panel managed-user-card" key={user.id}>
      <div className="managed-user-main"><div className="card-top"><span className={`user-status user-status-${user.status}`}>{user.status === "active" ? "已启用" : user.status === "pending" ? "待核验" : user.status === "banned" ? "已停用" : "已删除"}</span>{user.role === "host" ? <span className="host-badge">主播</span> : null}</div><h2>{user.username}</h2><div className="record-meta">{user.bilibiliUid ? <a className="managed-user-uid" href={`https://space.bilibili.com/${encodeURIComponent(user.bilibiliUid)}`} target="_blank" rel="noopener noreferrer" title="打开 B 站主页">UID：{user.bilibiliUid} ↗</a> : <span>UID：未绑定</span>}<span>注册于 {formatDate(user.createdAt)}</span>{user.deletedAt ? <span>删除于 {formatDate(user.deletedAt)}</span> : null}</div>{user.status === "pending" && user.verificationCode ? <code className="managed-verification-code">{user.verificationCode}</code> : null}</div>
      <div className="managed-user-actions">{user.status === "pending" && user.role === "user" ? <form action={approveBilibiliUserAction}><input type="hidden" name="userId" value={user.id}/><button className="button small primary" type="submit">批准账号</button></form> : null}{user.status === "active" && user.role === "user" ? <><ResetUserPassword userId={user.id} username={user.username}/><form action={managedUserStatusAction}><input name="userId" type="hidden" value={user.id}/><input name="status" type="hidden" value="banned"/><ConfirmSubmit label="停用" title={`停用 ${user.username}？`} description="账号会立即退出所有设备，之后可以重新启用。" confirmLabel="确认停用"/></form></> : null}{user.status === "banned" && user.role === "user" ? <form action={managedUserStatusAction}><input name="userId" type="hidden" value={user.id}/><input name="status" type="hidden" value="active"/><button className="button small primary" type="submit">重新启用</button></form> : null}{user.role === "user" && user.status !== "deleted" ? <form action={deleteManagedUserAction}><input name="userId" type="hidden" value={user.id}/><ConfirmSubmit label="删除" title={`永久删除 ${user.username}？`} description="账号会被匿名化且不能恢复；投稿、评论和棉花糖会以匿名账号保留。" confirmLabel="永久删除"/></form> : null}</div>
    </article>)}</div>
    {!data.items.length ? <div className="empty-state"><Check aria-hidden="true"/><h3>没有符合条件的用户</h3></div> : null}
  </>;
}
