import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleMore, Pin } from "lucide-react";
import { BvText } from "@/components/bv-text";
import { getPublicHostMusings } from "@/lib/data";
import { safePageNumber } from "@/lib/security";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "碎碎念", description: "主播写下的近况与随想。" };
export const dynamic = "force-dynamic";

export default async function MusingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = safePageNumber(params.page);
  const feed = await getPublicHostMusings(page);

  return <div className="page-shell musings-page">
    <header className="collection-hero musings-hero">
      <span className="collection-hero-mark"><MessageCircleMore aria-hidden="true"/></span>
      <div><span className="eyebrow">Host notes</span><h1>碎碎念</h1><p>一些近况、随想，和想说的话。</p></div>
    </header>

    <section className="musings-section" aria-labelledby="musings-title">
      <div className="section-heading"><div><span className="eyebrow">时间线</span><h2 id="musings-title">最近在想</h2></div><span className="live-dot"><i/> 最新优先</span></div>
      <div className="musings-list">
        {feed.items.map((item) => <article className={`panel musing-card${item.pinnedAt ? " is-pinned" : ""}`} key={item.id}>
          {item.pinnedAt ? <span className="musing-pinned"><Pin aria-hidden="true"/> 置顶</span> : null}
          <BvText className="musing-content">{item.content}</BvText>
          <footer><time dateTime={new Date(item.createdAt).toISOString()}>{formatDate(item.createdAt)}</time>{item.updatedAt.getTime() !== item.createdAt.getTime() ? <span>已编辑</span> : null}</footer>
        </article>)}
        {!feed.items.length ? <div className="empty-state"><MessageCircleMore aria-hidden="true"/><h3>这里还很安静</h3><p>主播发布碎碎念后会显示在这里。</p></div> : null}
      </div>
      {(page > 1 || feed.hasMore) ? <nav className="marshmallow-pagination" aria-label="碎碎念分页">
        {page > 1 ? <Link className="button ghost" href={`/musings?page=${page - 1}#musings-title`}>← 上一页</Link> : <span/>}
        <strong>第 {page} 页</strong>
        {feed.hasMore ? <Link className="button ghost" href={`/musings?page=${page + 1}#musings-title`}>下一页 →</Link> : <span/>}
      </nav> : null}
    </section>
  </div>;
}
