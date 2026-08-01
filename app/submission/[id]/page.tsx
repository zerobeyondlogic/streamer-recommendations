import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cloud, MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { z } from "zod";
import { deleteSubmissionReviewAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { Notice } from "@/components/notice";
import { ReviewEditor } from "@/components/review-editor";
import { SpoilerText } from "@/components/spoiler-text";
import { getCurrentUser } from "@/lib/auth";
import { categoryLabels, contentStatusLabel } from "@/lib/config";
import { getPublicSubmissionDetail } from "@/lib/data";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "作品详情与评论" };

export default async function PublicSubmissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string; reviewPage?: string }> }) {
  const [{ id: rawId }, messages, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const id = z.uuid().safeParse(rawId);
  if (!id.success) notFound();
  const requestedReviewPage = Math.max(1, Number.parseInt(messages.reviewPage ?? "1", 10) || 1);
  const detail = await getPublicSubmissionDetail(id.data, user?.id, requestedReviewPage);
  if (!detail) notFound();
  const { item, reviews, ownReview, reviewPage, reviewHasMore } = detail;
  const isHostRecommended = item.source === "host" || !!item.pinnedAt;

  return <div className="submission-detail-page page-shell">
    <Link className="back-link" href="/#feed">← 返回推荐库</Link>
    <Notice>{messages.error}</Notice><Notice type="success">{messages.success}</Notice>
    <article className="panel public-submission-detail">
      <div className="card-top"><span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span>{item.pinnedAt ? <span className="pin">置顶</span> : null}{isHostRecommended ? <span className="host-badge">{item.source === "host" ? "神绮爱原创" : "神绮爱推荐"}</span> : null}<span className="status">{contentStatusLabel(item.category, item.contentStatus)}</span></div>
      <div className="detail-title-row"><div><h1>{item.title}</h1><p>{item.source === "host" ? "由神绮爱撰写推荐" : `由 ${item.submitter} 推荐`} · 公开于 {formatDate(item.publishedAt)}</p></div>{item.score ? <span className="score"><b>{item.score}</b><small>/10</small></span> : null}</div>
      {item.description ? <p className="description detail-description"><BvText>{item.description}</BvText></p> : <p className="description muted">暂无推荐理由。</p>}
      {item.externalUrl ? <a className="external-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer nofollow">查看相关链接 ↗</a> : null}
      {item.pinNote ? <div className="pin-note"><strong>神绮爱推荐语</strong><BvText>{item.pinNote}</BvText></div> : null}
      {item.reply ? <div className="host-reply"><div className="reply-title"><span className="avatar">爱</span><strong>神绮爱感想</strong></div><p><BvText>{item.reply}</BvText></p><time>记录于 {formatDate(item.replyPublishedAt)}</time></div> : null}
    </article>

    <section className="community-review-summary panel" aria-labelledby="community-review-title">
      <div><span className="eyebrow">Community score</span><h2 id="community-review-title">大家的推荐</h2><p>每个账号一票；净推荐数 = 推荐 − 不推荐。</p></div>
      <div className={`community-score-large ${item.communityScore < 0 ? "is-negative" : ""}`}><ThumbsUp aria-hidden="true"/><strong>{item.communityScore > 0 ? `+${item.communityScore}` : item.communityScore}</strong><span>净推荐数</span></div>
      <div className="community-breakdown"><span><ThumbsUp aria-hidden="true"/>{item.recommendCount} 人推荐</span><span><ThumbsDown aria-hidden="true"/>{item.notRecommendCount} 人不推荐</span></div>
    </section>

    <section className="review-compose-section">
      <div className="section-heading"><div><span className="eyebrow">Your review</span><h2>写下你的评价</h2></div>{ownReview ? <form action={deleteSubmissionReviewAction}><input name="submissionId" type="hidden" value={item.id}/><button className="button small danger" type="submit">撤回我的评价</button></form> : null}</div>
      {user ? <ReviewEditor submissionId={item.id} initial={ownReview}/> : <div className="panel review-login-callout"><p>登录后即可推荐并评论。</p><Link className="button primary" href="/login">登录评价</Link></div>}
    </section>

    <section className="community-comments" id="comments" aria-labelledby="community-comments-title">
      <div className="section-heading"><div><span className="eyebrow">User reviews</span><h2 id="community-comments-title">用户评论</h2></div><span className="comment-count"><MessageCircle aria-hidden="true"/>{item.commentCount} 条文字评论</span></div>
      <div className="community-comment-list">{reviews.map((review) => <article className={`panel community-comment-card ${review.recommend ? "is-recommended" : "is-not-recommended"}`} key={review.id}>
        <header><span className="review-author">{review.username}</span><span className="review-verdict">{review.recommend ? <><ThumbsUp aria-hidden="true"/>推荐</> : <><ThumbsDown aria-hidden="true"/>不推荐</>}</span></header>
        <SpoilerText className="community-comment-copy">{review.comment ?? ""}</SpoilerText>
        <footer>评价于 {formatDate(review.updatedAt)}</footer>
      </article>)}</div>
      {!reviews.length ? <div className="empty-state"><Cloud aria-hidden="true"/><h3>还没有评论</h3></div> : null}
      {(reviewPage > 1 || reviewHasMore) ? <nav className="marshmallow-pagination" aria-label="评论分页">{reviewPage > 1 ? <Link className="button ghost" href={`/submission/${item.id}?reviewPage=${reviewPage - 1}#comments`}>← 上一页</Link> : <span/>}<strong>第 {reviewPage} 页</strong>{reviewHasMore ? <Link className="button ghost" href={`/submission/${item.id}?reviewPage=${reviewPage + 1}#comments`}>下一页 →</Link> : <span/>}</nav> : null}
    </section>
  </div>;
}
