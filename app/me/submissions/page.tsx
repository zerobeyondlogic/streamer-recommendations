import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Cloud, Pencil, Send } from "lucide-react";
import { deleteOwnMarshmallowAction, deleteOwnSubmissionAction, updateOwnMarshmallowAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { categoryLabels, contentStatusLabel } from "@/lib/config";
import { getMyMarshmallows, getMySubmissions } from "@/lib/data";
import { canAuthorEditMarshmallow } from "@/lib/transitions";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "我的投稿" };

export default async function MySubmissionsPage({ searchParams }: { searchParams: Promise<{ minePage?: string; error?: string; success?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.minePage ?? "1", 10);
  const minePage = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const [items, marshmallows] = await Promise.all([getMySubmissions(user.id), getMyMarshmallows(user.id, minePage)]);

  return <div className="form-page wide personal-records-page">
    <header className="form-header"><span className="eyebrow">个人记录</span><h1>我的投稿</h1><p>作品投稿和棉花糖都在这里。</p></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>

    <nav className="personal-record-tabs" aria-label="个人记录分类">
      <a href="#work-submissions"><Send aria-hidden="true"/>作品投稿</a>
      <a href="#my-marshmallows"><Cloud aria-hidden="true"/>我的棉花糖</a>
    </nav>

    <section id="work-submissions" className="personal-record-section" aria-labelledby="work-submissions-title">
      <div className="section-heading"><div><span className="eyebrow">作品</span><h2 id="work-submissions-title">作品投稿</h2></div></div>
      <div className="record-list">{items.map((item) => <article className="panel record-card" key={item.id}>
        <div className="record-main"><div className="card-top"><span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span>{item.anonymousPublic ? <span className="pin">匿名展示</span> : null}{item.score ? <span className="score compact-score"><b>{item.score}</b><small>/10</small></span> : null}{item.unread ? <span className="unread-pill">有新回复</span> : null}</div><h2>{item.title}</h2><div className="record-meta"><span>{formatDate(item.createdAt)}</span><span>{item.hostReadAt ? "已查看" : "未查看"}</span><span>{item.publishedAt ? "已公开" : "未公开"}</span><span>{contentStatusLabel(item.category, item.contentStatus)}</span>{item.deletedAt ? <span className="danger-text">已删除</span> : null}</div>{item.reply ? <div className="host-reply"><strong>神绮爱感想</strong><p><BvText>{item.reply}</BvText></p></div> : null}</div>
        <div className="record-actions">{!item.hostReadAt && !item.deletedAt ? <form action={deleteOwnSubmissionAction}><input type="hidden" name="submissionId" value={item.id}/><button className="button small danger" type="submit">撤回</button></form> : null}{item.publishedAt && !item.deletedAt ? <Link className="button small ghost" href={`/submission/${item.id}`}>查看详情</Link> : null}</div>
      </article>)}</div>
      {items.length === 0 ? <div className="empty-state"><Send aria-hidden="true"/><h3>还没有作品投稿</h3><Link className="button primary" href="/submit">去投稿</Link></div> : null}
    </section>

    <section className="my-marshmallows personal-record-section" id="my-marshmallows" aria-labelledby="my-marshmallows-title">
      <div className="section-heading"><div><span className="eyebrow">棉花糖</span><h2 id="my-marshmallows-title">我的棉花糖</h2></div><span className="live-dot"><Clock3 aria-hidden="true"/> 首次投递顺序</span></div>
      <div className="my-marshmallow-list">{marshmallows.items.map((item) => {
        const editable = canAuthorEditMarshmallow(item.readAt, item.deletedAt);
        const status = item.deletedAt ? "已移除" : item.publishedAt ? "已上墙" : item.readAt ? "已读 · 未上墙" : "待查看";
        return <article className={`panel my-marshmallow-card ${editable ? "is-editable" : "is-locked"}`} key={item.id}>
          <div className="my-marshmallow-meta"><time>投递于 {formatDate(item.createdAt)}</time><span className={`privacy-pill ${item.publishedAt ? "can-publish" : "private"}`}>{status}</span></div>
          <BvText className="my-marshmallow-copy">{item.content}</BvText>
          <div className="my-marshmallow-footer"><span>{item.allowPublic ? "允许上墙" : "仅神绮爱可见"}</span>{item.updatedAt.getTime() > item.createdAt.getTime() ? <span>修改于 {formatDate(item.updatedAt)}</span> : null}</div>
          {editable ? <div className="my-marshmallow-actions">
            <details className="my-marshmallow-editor"><summary><Pencil aria-hidden="true"/> 修改</summary><form className="stack" action={updateOwnMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><label>内容<textarea name="content" maxLength={1000} required defaultValue={item.content}/></label><label className="checkbox"><input name="allowPublic" type="checkbox" defaultChecked={item.allowPublic}/><span>已读后允许上墙</span></label><button className="button small primary" type="submit">保存并重新投递</button><span className="helper">首次投递时间不变。</span></form></details>
            <form action={deleteOwnMarshmallowAction}><input name="marshmallowId" type="hidden" value={item.id}/><ConfirmSubmit label="删除" title="删除这颗棉花糖？" description="删除后无法恢复。" confirmLabel="确认删除"/></form>
          </div> : <span className="my-marshmallow-locked">已处理，不能修改或删除</span>}
        </article>;
      })}</div>
      {!marshmallows.items.length ? <div className="empty-state"><Cloud aria-hidden="true"/><h3>还没有棉花糖</h3><Link className="button primary" href="/marshmallow">投递棉花糖</Link></div> : null}
      {(minePage > 1 || marshmallows.hasMore) ? <nav className="marshmallow-pagination" aria-label="我的棉花糖分页">
        {minePage > 1 ? <Link className="button ghost" href={`/me/submissions?minePage=${minePage - 1}#my-marshmallows`}>← 上一页</Link> : <span/>}<strong>第 {minePage} 页</strong>{marshmallows.hasMore ? <Link className="button ghost" href={`/me/submissions?minePage=${minePage + 1}#my-marshmallows`}>下一页 →</Link> : <span/>}
      </nav> : null}
    </section>
  </div>;
}
