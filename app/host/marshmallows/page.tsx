import type { Metadata } from "next";
import Link from "next/link";
import { Eye, RotateCcw } from "lucide-react";
import { deleteMarshmallowAction, restoreMarshmallowAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { getHostMarshmallows, type MarshmallowHostStatus } from "@/lib/data";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "棉花糖管理" };
const statuses: { value: MarshmallowHostStatus; label: string }[] = [
  { value: "pending", label: "待展示" }, { value: "all", label: "全部" }, { value: "read", label: "已读" },
  { value: "published", label: "已公开" }, { value: "private", label: "私密已读" }, { value: "deleted", label: "已移除" },
];

export default async function MarshmallowManagerPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const status = statuses.some((item) => item.value === params.status) ? params.status as MarshmallowHostStatus : "pending";
  const items = await getHostMarshmallows(status);
  const returnTo = `/host/marshmallows?status=${status}`;
  return <>
    <header className="host-heading"><div><span className="eyebrow">Marshmallow inbox</span><h1>棉花糖投稿管理</h1><p>打开列表、切换卡片或跳过都不会标记已读，也不会公开。只有展示台中的“已读”按钮会完成处理。</p></div><Link className="button primary" href="/host/marshmallows/stage"><Eye aria-hidden="true"/> 进入展示台</Link></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    <nav className="marshmallow-status-tabs" aria-label="棉花糖状态筛选">{statuses.map((item) => <Link className={status === item.value ? "is-active" : ""} href={`/host/marshmallows?status=${item.value}`} key={item.value}>{item.label}</Link>)}</nav>
    <div className="marshmallow-manager-list">{items.map((item) => <article className={`panel marshmallow-manager-card ${item.deletedAt ? "is-deleted" : ""}`} key={item.id}>
      <div className="marshmallow-manager-meta"><strong>{item.username}</strong><time>{formatDate(item.createdAt)}</time><span className={`privacy-pill ${item.allowPublic ? "can-publish" : "private"}`}>{item.allowPublic ? "允许公开" : "私密"}</span></div>
      <BvText className="marshmallow-manager-copy">{item.content}</BvText>
      <div className="marshmallow-state-line"><span>{item.deletedAt ? `已移除 · ${formatDate(item.deletedAt)}` : item.readAt ? `已读 · ${formatDate(item.readAt)}` : "待展示"}</span>{item.publishedAt ? <span>已公开 · {formatDate(item.publishedAt)}</span> : null}</div>
      <div className="record-actions">
        {!item.readAt && !item.deletedAt ? <Link className="button small primary" href={`/host/marshmallows/stage?id=${item.id}`}>从这条开始展示</Link> : null}
        {item.deletedAt ? <form action={restoreMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={returnTo}/><button className="button small ghost" type="submit"><RotateCcw aria-hidden="true"/> 恢复</button></form> : <form action={deleteMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={returnTo}/><ConfirmSubmit/></form>}
      </div>
    </article>)}</div>
    {!items.length ? <div className="empty-state"><span>☁︎</span><h3>这里暂时没有棉花糖</h3><p>切换其他状态看看，或者等待新的投递。</p></div> : null}
  </>;
}
