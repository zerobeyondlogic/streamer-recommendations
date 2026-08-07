import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, MessageCircleMore, Pencil, Pin, PinOff, Send } from "lucide-react";
import { createHostMusingAction, deleteHostMusingAction, pinHostMusingAction, updateHostMusingAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { getHostMusings } from "@/lib/data";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "碎碎念管理" };

export default async function HostMusingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const items = await getHostMusings();

  return <>
    <header className="host-heading"><div><span className="eyebrow">主播发言</span><h1>碎碎念</h1><p>发布近况和随想。这里只有主播可以发言。</p></div><Link className="button ghost" href="/musings" target="_blank"><ExternalLink aria-hidden="true"/> 查看公开页</Link></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>

    <form className="panel stack host-musing-compose" action={createHostMusingAction}>
      <label>写点什么<textarea name="content" maxLength={2000} required placeholder="今天想说什么？"/><span className="helper">最多 2000 字，发布后立即公开；BV 号会自动链接。</span></label>
      <button className="button primary" type="submit"><Send aria-hidden="true"/> 发布碎碎念</button>
    </form>

    <div className="host-musing-heading"><h2>已发布</h2><span>{items.length} 条</span></div>
    <div className="host-list host-musing-list">
      {items.map((item) => <article className={`panel host-musing-card${item.pinnedAt ? " is-pinned" : ""}`} key={item.id}>
        <div className="host-musing-meta"><span>{item.pinnedAt ? <><Pin aria-hidden="true"/> 已置顶</> : "普通"}</span><time>{formatDate(item.createdAt)}</time>{item.updatedAt.getTime() !== item.createdAt.getTime() ? <small>已编辑</small> : null}</div>
        <BvText className="host-musing-content">{item.content}</BvText>
        <div className="record-actions host-musing-actions">
          <details className="host-musing-editor"><summary><Pencil aria-hidden="true"/> 编辑</summary><form className="stack" action={updateHostMusingAction}><input name="hostMusingId" type="hidden" value={item.id}/><label>内容<textarea name="content" maxLength={2000} required defaultValue={item.content}/></label><button className="button small primary" type="submit">保存修改</button></form></details>
          <form action={pinHostMusingAction}><input name="hostMusingId" type="hidden" value={item.id}/><input name="pin" type="hidden" value={item.pinnedAt ? "false" : "true"}/><button className="button small ghost" type="submit">{item.pinnedAt ? <PinOff aria-hidden="true"/> : <Pin aria-hidden="true"/>}{item.pinnedAt ? "取消置顶" : "置顶"}</button></form>
          <form action={deleteHostMusingAction}><input name="hostMusingId" type="hidden" value={item.id}/><ConfirmSubmit label="删除" title="永久删除这条碎碎念？" description="删除后无法恢复。" confirmLabel="确认删除"/></form>
        </div>
      </article>)}
      {!items.length ? <div className="empty-state"><MessageCircleMore aria-hidden="true"/><h3>还没有碎碎念</h3><p>在上方写下第一条吧。</p></div> : null}
    </div>
  </>;
}
