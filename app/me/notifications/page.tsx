import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cloud } from "lucide-react";
import { readAllNotificationsAction, readNotificationAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data";
import { formatDate } from "@/lib/view";
export const metadata: Metadata = { title: "站内消息" };
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ unread?: string; success?: string }> }) {
  const user = await requireUser(); const params = await searchParams; const items = await getNotifications(user.id, params.unread === "1");
  return <div className="form-page wide"><header className="form-header"><span className="eyebrow">提醒</span><h1>站内消息</h1><p>评论回复、感想与置顶提醒会显示在这里。</p></header><Notice type="success">{params.success}</Notice><div className="toolbar"><div><Link className={`button small ${params.unread?"ghost":"primary"}`} href="/me/notifications">全部</Link><Link className={`button small ${params.unread?"primary":"ghost"}`} href="/me/notifications?unread=1">未读</Link></div><form action={readAllNotificationsAction}><button className="button small ghost" type="submit">全部已读</button></form></div><div className="record-list">{items.map((item)=><form action={readNotificationAction} key={item.id}><input type="hidden" name="notificationId" value={item.id}/><input type="hidden" name="submissionId" value={item.submissionId??""}/><input type="hidden" name="reviewReplyId" value={item.reviewReplyId??""}/><button className={`panel notification-card ${item.readAt?"":"unread"}`} type="submit"><span className="avatar">{item.type==="review_reply"?"评":"爱"}</span><span><strong>{item.type==="review_reply"?`${item.actorUsername??"有人"} 回复了你的评论`:item.type==="host_reply"?"神绮爱发表了感想":item.type==="submission_pinned"?"神绮爱推荐了你的投稿":"神绮爱更新了感想"}</strong><small>《{item.title??"已删除的投稿"}》 · {formatDate(item.createdAt)}</small></span><ArrowRight aria-hidden="true"/></button></form>)}</div>{items.length===0?<div className="empty-state"><Cloud aria-hidden="true"/><h3>暂无消息</h3></div>:null}</div>;
}
