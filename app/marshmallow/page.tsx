import type { Metadata } from "next";
import Link from "next/link";
import { Cloud, LockKeyhole, Send } from "lucide-react";
import { submitMarshmallowAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { Notice } from "@/components/notice";
import { getCurrentUser } from "@/lib/auth";
import { getPublicMarshmallows, getSiteCopy } from "@/lib/data";
import { safePageNumber } from "@/lib/security";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "Marshmallow 棉花糖", description: "把想对神绮爱说的话装进一颗棉花糖。" };

export default async function MarshmallowPage({ searchParams }: { searchParams: Promise<{ page?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const page = safePageNumber(params.page);
  const [user, feed, siteCopy] = await Promise.all([getCurrentUser(), getPublicMarshmallows(page), getSiteCopy()]);

  return <div className="marshmallow-page page-shell">
    <header className="collection-hero marshmallow-hero">
      <span className="collection-hero-mark marshmallow-hero-icon"><Cloud aria-hidden="true"/></span>
      <div className="marshmallow-hero-copy"><span className="eyebrow">Marshmallow</span><h1>{siteCopy.marshmallowHeroTitle}</h1><p>{siteCopy.marshmallowTagline}</p>{!user ? <div className="marshmallow-hero-auth"><LockKeyhole aria-hidden="true"/><span><strong>登录后投递</strong><small>公开墙可直接浏览。</small></span><Link className="button small primary" href="/login">登录</Link><Link className="button small ghost" href="/register">注册</Link></div> : null}</div>
    </header>

    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>

    {user ? <section className="marshmallow-compose panel">
      <form className="stack" action={submitMarshmallowAction}>
        <label>想说的话<textarea name="content" maxLength={1000} required placeholder="今天想说什么？"/><span className="helper">最多 1000 字，BV 号会自动链接。</span></label>
        <label className="checkbox marshmallow-public-choice"><input name="allowPublic" type="checkbox"/><span><strong>已读后允许上墙</strong><span className="helper">不勾选则始终私密。</span></span></label>
        <button className="button primary" type="submit"><Send aria-hidden="true"/> 投递棉花糖</button>
      </form>
    </section> : null}

    <section className="marshmallow-wall" aria-labelledby="marshmallow-wall-title">
      <div className="section-heading"><div><span className="eyebrow">公开墙</span><h2 id="marshmallow-wall-title">{siteCopy.marshmallowSectionTitle}</h2></div><span className="live-dot"><i/> 最新优先</span></div>
      <div className="marshmallow-wall-grid">
        {feed.items.map((item) => <article className="marshmallow-wall-card" key={item.id}>
          <Cloud className="marshmallow-card-cloud" aria-hidden="true"/><BvText className="marshmallow-wall-copy">{item.content}</BvText><time>{formatDate(item.publishedAt)}</time>
        </article>)}
        {!feed.items.length ? <div className="empty-state"><Cloud aria-hidden="true"/><h3>还没有公开棉花糖</h3></div> : null}
      </div>
      {(page > 1 || feed.hasMore) ? <nav className="marshmallow-pagination" aria-label="棉花糖分页">
        {page > 1 ? <Link className="button ghost" href={`/marshmallow?page=${page - 1}#marshmallow-wall-title`}>← 上一页</Link> : <span/>}
        <strong>第 {page} 页</strong>
        {feed.hasMore ? <Link className="button ghost" href={`/marshmallow?page=${page + 1}#marshmallow-wall-title`}>下一页 →</Link> : <span/>}
      </nav> : null}
    </section>
  </div>;
}
