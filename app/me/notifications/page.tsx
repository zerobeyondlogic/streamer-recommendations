import type { Metadata } from "next";
import Link from "next/link";
import { readAllNotificationsAction, readNotificationAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data";
import { formatDate } from "@/lib/view";
export const metadata: Metadata = { title: "站内消息" };
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ unread?: string; success?: string }> }) {
  const user = await requireUser(); const params = await searchParams; const items = await getNotifications(user.id, params.unread === "1");
  return <div className="form-page wide"><header className="form-header"><span className="eyebrow">神绮爱回信</span><h1>站内消息</h1><p>神绮爱首次发表感想时，你会在这里收到提醒。</p></header><Notice type="success">{params.success}</Notice><div className="toolbar"><div><Link className={`button small ${params.unread?"ghost":"primary"}`} href="/me/notifications">全部</Link><Link className={`button small ${params.unread?"primary":"ghost"}`} href="/me/notifications?unread=1">只看未读</Link></div><form action={readAllNotificationsAction}><button className="button small ghost" type="submit">全部标记已读</button></form></div><div className="record-list">{items.map((item)=><form action={readNotificationAction} key={item.id}><input type="hidden" name="notificationId" value={item.id}/><input type="hidden" name="submissionId" value={item.submissionId??""}/><button className={`panel notification-card ${item.readAt?"":"unread"}`} type="submit"><span className="avatar">主</span><span><strong>{item.type==="host_reply"?"神绮爱发表了新感想":"神绮爱更新了感想"}</strong><small>关于《{item.title??"已删除的投稿"}》 · {formatDate(item.createdAt)}</small></span><b>→</b></button></form>)}</div>{items.length===0?<div className="empty-state"><span>☁︎</span><h3>暂时没有消息</h3><p>等神绮爱体验完你推荐的作品，消息就会飞来。</p></div>:null}</div>;
}
