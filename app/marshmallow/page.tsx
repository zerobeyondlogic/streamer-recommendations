import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole, MessageCircleHeart, Send } from "lucide-react";
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
  const [user, feed] = await Promise.all([getCurrentUser(), getPublicMarshmallows(page)]);

  return <div className="marshmallow-page page-shell">
    <header className="marshmallow-hero">
      <span className="marshmallow-hero-icon"><MessageCircleHeart aria-hidden="true"/></span>
      <div><span className="eyebrow">Marshmallow</span><h1>给神绮爱一颗棉花糖</h1><p>写下想说的话。所有棉花糖提交后都会先保持私密，不会因为神绮爱打开列表而自动公开。</p></div>
    </header>

    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>

    <section className="marshmallow-compose panel">
      {user ? <form className="stack" action={submitMarshmallowAction}>
        <label>想对神绮爱说的话<textarea name="content" maxLength={1000} required placeholder="今天想说什么？"/><span className="helper">最多 1000 字；BV 号会自动变成可点击的视频链接。</span></label>
        <label className="checkbox marshmallow-public-choice"><input name="allowPublic" type="checkbox"/><span><strong>已读后允许公开到棉花糖墙</strong><span className="helper">默认不勾选。即使勾选，也只有神绮爱展示并点击“已读”后才会公开；不勾选则永远不会出现在公开墙。</span></span></label>
        <button className="button primary" type="submit"><Send aria-hidden="true"/> 送出棉花糖</button>
      </form> : <div className="marshmallow-login-callout"><LockKeyhole aria-hidden="true"/><div><h2>登录后才能投递</h2><p>棉花糖公开墙可以直接浏览；投递需要使用已经通过 UID 核验的账号。</p><div className="form-actions"><Link className="button primary" href="/login">登录</Link><Link className="button ghost" href="/register">注册</Link></div></div></div>}
    </section>

    <section className="marshmallow-wall" aria-labelledby="marshmallow-wall-title">
      <div className="section-heading"><div><span className="eyebrow">公开棉花糖墙</span><h2 id="marshmallow-wall-title">神绮爱读过的棉花糖</h2></div><span className="live-dot"><i/>最新的排在最前</span></div>
      <div className="marshmallow-wall-grid">
        {feed.items.map((item) => <article className="marshmallow-wall-card" key={item.id}>
          <span aria-hidden="true">☁</span><BvText className="marshmallow-wall-copy">{item.content}</BvText><time>{formatDate(item.publishedAt)}</time>
        </article>)}
        {!feed.items.length ? <div className="empty-state"><span>☁︎</span><h3>公开墙还很安静</h3><p>只有得到公开许可、并被神绮爱展示已读的棉花糖才会出现在这里。</p></div> : null}
      </div>
      {(page > 1 || feed.hasMore) ? <nav className="marshmallow-pagination" aria-label="棉花糖分页">
        {page > 1 ? <Link className="button ghost" href={`/marshmallow?page=${page - 1}`}>← 上一页</Link> : <span/>}
        <strong>第 {page} 页</strong>
        {feed.hasMore ? <Link className="button ghost" href={`/marshmallow?page=${page + 1}`}>下一页 →</Link> : <span/>}
      </nav> : null}
    </section>
  </div>;
}
