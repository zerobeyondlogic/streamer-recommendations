import type { Metadata } from "next";
import { approveBilibiliUserAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { getPendingBilibiliUsers } from "@/lib/data";
import { formatDate } from "@/lib/view";
export const metadata: Metadata = { title: "B 站 UID 核验" };
export default async function HostUsersPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [users, params] = await Promise.all([getPendingBilibiliUsers(), searchParams]);
  return <><header className="host-heading"><div><span className="eyebrow">Identity review</span><h1>B 站 UID 核验</h1><p>签名中的验证码一致后批准。</p></div></header><Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice><div className="host-list">{users.map((user) => <article className="panel uid-card" key={user.id}><div><span className="eyebrow">等待核验 · {formatDate(user.createdAt)}</span><h2>{user.username}</h2><p>UID：<strong>{user.bilibiliUid}</strong></p><code>{user.verificationCode}</code></div><div className="record-actions"><a className="button small ghost" href={`https://space.bilibili.com/${user.bilibiliUid}`} target="_blank" rel="noopener noreferrer">打开 B 站空间 ↗</a><form action={approveBilibiliUserAction}><input type="hidden" name="userId" value={user.id} /><button className="button small primary" type="submit">批准账号</button></form></div></article>)}</div>{!users.length ? <div className="empty-state"><span>✓</span><h3>没有待核验账号</h3></div> : null}</>;
}
