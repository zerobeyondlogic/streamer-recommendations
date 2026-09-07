import type { Metadata } from "next";
import Link from "next/link";
import { Check, Cloud, Eye, MessageSquareReply, RotateCcw, Sparkles } from "lucide-react";
import { deleteMarshmallowAction, publishMarshmallowAction, readMarshmallowAction, replyMarshmallowAction, restoreMarshmallowAction, unpublishMarshmallowAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { MarshmallowReply } from "@/components/marshmallow-reply";
import { Notice } from "@/components/notice";
import { getHostMarshmallows, type MarshmallowHostStatus } from "@/lib/data";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "棉花糖" };
const statuses: { value: MarshmallowHostStatus; label: string }[] = [
  { value: "pending", label: "未读" }, { value: "read", label: "已读" }, { value: "published", label: "已上墙" },
  { value: "private", label: "已读未上墙" }, { value: "unpublished", label: "已下架" }, { value: "deleted", label: "已移除" }, { value: "all", label: "全部" },
];

export default async function MarshmallowManagerPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const status = statuses.some((item) => item.value === params.status) ? params.status as MarshmallowHostStatus : "pending";
  const items = await getHostMarshmallows(status);
  const returnTo = `/host/marshmallows?status=${status}`;
  return <>
    <header className="host-heading"><div><span className="eyebrow">棉花糖</span><h1>收件箱</h1><p>已读与回复不会自动上墙。</p></div><Link className="button ghost" href="/host/marshmallows/stage"><Eye aria-hidden="true"/> 进入展示台</Link></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    <nav className="marshmallow-status-tabs" aria-label="棉花糖状态筛选">{statuses.map((item) => <Link className={status === item.value ? "is-active" : ""} href={`/host/marshmallows?status=${item.value}`} key={item.value}>{item.label}</Link>)}</nav>
    <div className="marshmallow-manager-list">{items.map((item) => <article className={`panel marshmallow-manager-card ${item.deletedAt ? "is-deleted" : ""}`} id={`marshmallow-${item.id}`} key={item.id}>
      <div className="marshmallow-manager-meta"><strong>{item.username}</strong><time>{formatDate(item.createdAt)}</time><span className={`privacy-pill ${item.allowPublic ? "can-publish" : "private"}`}>{item.allowPublic ? "可上墙" : "仅私密"}</span></div>
      <BvText className="marshmallow-manager-copy">{item.content}</BvText>
      <MarshmallowReply content={item.replyContent} updatedAt={item.replyUpdatedAt ?? item.repliedAt}/>
      <div className="marshmallow-state-line"><span>{item.deletedAt ? `已移除 · ${formatDate(item.deletedAt)}` : item.publishedAt ? `已上墙 · ${formatDate(item.publishedAt)}` : item.unpublishedAt ? `已下架 · ${formatDate(item.unpublishedAt)}` : item.readAt ? `已读 · ${formatDate(item.readAt)}` : "未读"}</span></div>
      <div className="record-actions">
        {!item.readAt && !item.deletedAt ? <>
          {item.allowPublic ? <Link className="button small ghost" href={`/host/marshmallows/stage?id=${item.id}`}><Eye aria-hidden="true"/> 展示</Link> : null}
          <form action={readMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={returnTo}/><button className="button small ghost" type="submit"><Check aria-hidden="true"/> 标记已读</button></form>
        </> : null}
        {!item.deletedAt && item.allowPublic && !item.publishedAt ? <form action={publishMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={returnTo}/><button className="button small primary" type="submit"><Sparkles aria-hidden="true"/>{item.unpublishedAt ? "重新上墙" : "公开上墙"}</button></form> : null}
        {!item.deletedAt && item.publishedAt ? <form action={unpublishMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={returnTo}/><ConfirmSubmit label="下架" title="下架这颗棉花糖？" description="从公开墙隐藏，内容和回复仍会保留，可随时重新上墙。" confirmLabel="确认下架"/></form> : null}
        {item.deletedAt ? <form action={restoreMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={returnTo}/><button className="button small ghost" type="submit"><RotateCcw aria-hidden="true"/> 恢复</button></form> : <form action={deleteMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={returnTo}/><ConfirmSubmit/></form>}
      </div>
      {!item.deletedAt ? <details className="marshmallow-reply-editor"><summary><MessageSquareReply aria-hidden="true"/>{item.replyContent ? "修改回复" : "回复"}</summary><form className="stack" action={replyMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={`/host/marshmallows?status=all#marshmallow-${item.id}`}/><label>回复内容<textarea name="content" maxLength={2000} required defaultValue={item.replyContent ?? ""} placeholder="写下回复…"/></label><span className="helper">{!item.allowPublic ? "回复仅投稿人和主播可见。" : item.publishedAt ? "这颗棉花糖已上墙，回复将同步公开。" : "对方可在“我的投稿”查看。上墙后随棉花糖公开。"}</span><button className="button small primary" type="submit">{item.replyContent ? "保存回复" : "发送回复"}</button></form></details> : null}
    </article>)}</div>
    {!items.length ? <div className="empty-state"><Cloud aria-hidden="true"/><h3>暂无棉花糖</h3></div> : null}
  </>;
}
