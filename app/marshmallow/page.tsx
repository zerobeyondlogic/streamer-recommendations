import type { Metadata } from "next";
import Link from "next/link";
import { Cloud, LockKeyhole, Send } from "lucide-react";
import { submitMarshmallowAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { Notice } from "@/components/notice";
import { getCurrentUser } from "@/lib/auth";
import { getPublicMarshmallows } from "@/lib/data";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "Marshmallow 棉花糖", description: "把想对神绮爱说的话装进一颗棉花糖。" };

export default async function MarshmallowPage({ searchParams }: { searchParams: Promise<{ page?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const user = await getCurrentUser();
  const feed = await getPublicMarshmallows(page);

  return <div className="marshmallow-page page-shell">
    <header className="marshmallow-hero">
      <span className="marshmallow-hero-icon"><Cloud aria-hidden="true"/></span>
      <div><span className="eyebrow">Marshmallow</span><h1>给神绮爱一颗棉花糖</h1><p>写下想说的话，默认仅神绮爱可见。</p></div>
    </header>

    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>

    <section className="marshmallow-compose panel">
      {user ? <form className="stack" action={submitMarshmallowAction}>
        <label>想说的话<textarea name="content" maxLength={1000} required placeholder="今天想说什么？"/><span className="helper">最多 1000 字，BV 号会自动链接。</span></label>
        <label className="checkbox marshmallow-public-choice"><input name="allowPublic" type="checkbox"/><span><strong>已读后允许上墙</strong><span className="helper">不勾选则始终私密。</span></span></label>
        <button className="button primary" type="submit"><Send aria-hidden="true"/> 投递棉花糖</button>
      </form> : <div className="marshmallow-login-callout"><LockKeyhole aria-hidden="true"/><div><h2>登录后投递</h2><p>公开墙可直接浏览。</p><div className="form-actions"><Link className="button primary" href="/login">登录</Link><Link className="button ghost" href="/register">注册</Link></div></div></div>}
    </section>

    <section className="marshmallow-wall" aria-labelledby="marshmallow-wall-title">
      <div className="section-heading"><div><span className="eyebrow">公开墙</span><h2 id="marshmallow-wall-title">已上墙的棉花糖</h2></div><span className="live-dot"><i/> 最新优先</span></div>
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
