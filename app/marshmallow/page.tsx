import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, LockKeyhole, MessageCircleHeart, Pencil, Send } from "lucide-react";
import { deleteOwnMarshmallowAction, submitMarshmallowAction, updateOwnMarshmallowAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { getCurrentUser } from "@/lib/auth";
import { getMyMarshmallows, getPublicMarshmallows } from "@/lib/data";
import { canAuthorEditMarshmallow } from "@/lib/transitions";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "Marshmallow 棉花糖", description: "把想对神绮爱说的话装进一颗棉花糖。" };

export default async function MarshmallowPage({ searchParams }: { searchParams: Promise<{ page?: string; minePage?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const requestedMinePage = Number.parseInt(params.minePage ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const minePage = Number.isFinite(requestedMinePage) ? Math.max(1, requestedMinePage) : 1;
  const user = await getCurrentUser();
  const [feed, mine] = await Promise.all([
    getPublicMarshmallows(page),
    user ? getMyMarshmallows(user.id, minePage) : Promise.resolve(null),
  ]);

  return <div className="marshmallow-page page-shell">
    <header className="marshmallow-hero">
      <span className="marshmallow-hero-icon"><MessageCircleHeart aria-hidden="true"/></span>
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

    {user && mine ? <section className="my-marshmallows" id="mine" aria-labelledby="my-marshmallows-title">
      <div className="section-heading"><div><span className="eyebrow">个人记录</span><h2 id="my-marshmallows-title">我的棉花糖</h2></div><span className="live-dot"><Clock3 aria-hidden="true"/> 按首次投递时间排序</span></div>
      <div className="my-marshmallow-list">{mine.items.map((item) => {
        const editable = canAuthorEditMarshmallow(item.readAt, item.deletedAt);
        const status = item.deletedAt ? "已移除" : item.publishedAt ? "已上墙" : item.readAt ? "已读 · 未上墙" : "待查看";
        return <article className={`panel my-marshmallow-card ${editable ? "is-editable" : "is-locked"}`} key={item.id}>
          <div className="my-marshmallow-meta"><time>投递于 {formatDate(item.createdAt)}</time><span className={`privacy-pill ${item.publishedAt ? "can-publish" : "private"}`}>{status}</span></div>
          <BvText className="my-marshmallow-copy">{item.content}</BvText>
          <div className="my-marshmallow-footer"><span>{item.allowPublic ? "允许上墙" : "仅神绮爱可见"}</span>{item.updatedAt.getTime() > item.createdAt.getTime() ? <span>修改于 {formatDate(item.updatedAt)}</span> : null}</div>
          {editable ? <div className="my-marshmallow-actions">
            <details className="my-marshmallow-editor"><summary><Pencil aria-hidden="true"/> 修改</summary><form className="stack" action={updateOwnMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><label>内容<textarea name="content" maxLength={1000} required defaultValue={item.content}/></label><label className="checkbox"><input name="allowPublic" type="checkbox" defaultChecked={item.allowPublic}/><span>已读后允许上墙</span></label><button className="button small primary" type="submit">保存并重新投递</button><span className="helper">仍按首次投递时间排队。</span></form></details>
            <form action={deleteOwnMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><ConfirmSubmit label="删除" title="删除这颗棉花糖？" description="删除后无法恢复。" confirmLabel="确认删除"/></form>
          </div> : <span className="my-marshmallow-locked">已处理，不能修改或删除</span>}
        </article>;
      })}</div>
      {!mine.items.length ? <div className="empty-state"><span>☁︎</span><h3>还没有棉花糖</h3></div> : null}
      {(minePage > 1 || mine.hasMore) ? <nav className="marshmallow-pagination" aria-label="我的棉花糖分页">
        {minePage > 1 ? <Link className="button ghost" href={`/marshmallow?minePage=${minePage - 1}#mine`}>← 上一页</Link> : <span/>}<strong>第 {minePage} 页</strong>{mine.hasMore ? <Link className="button ghost" href={`/marshmallow?minePage=${minePage + 1}#mine`}>下一页 →</Link> : <span/>}
      </nav> : null}
    </section> : null}

    <section className="marshmallow-wall" aria-labelledby="marshmallow-wall-title">
      <div className="section-heading"><div><span className="eyebrow">公开墙</span><h2 id="marshmallow-wall-title">已上墙的棉花糖</h2></div><span className="live-dot"><i/> 最新优先</span></div>
      <div className="marshmallow-wall-grid">
        {feed.items.map((item) => <article className="marshmallow-wall-card" key={item.id}>
          <span aria-hidden="true">☁</span><BvText className="marshmallow-wall-copy">{item.content}</BvText><time>{formatDate(item.publishedAt)}</time>
        </article>)}
        {!feed.items.length ? <div className="empty-state"><span>☁︎</span><h3>还没有公开棉花糖</h3></div> : null}
      </div>
      {(page > 1 || feed.hasMore) ? <nav className="marshmallow-pagination" aria-label="棉花糖分页">
        {page > 1 ? <Link className="button ghost" href={`/marshmallow?page=${page - 1}#marshmallow-wall-title`}>← 上一页</Link> : <span/>}
        <strong>第 {page} 页</strong>
        {feed.hasMore ? <Link className="button ghost" href={`/marshmallow?page=${page + 1}#marshmallow-wall-title`}>下一页 →</Link> : <span/>}
      </nav> : null}
    </section>
  </div>;
}
