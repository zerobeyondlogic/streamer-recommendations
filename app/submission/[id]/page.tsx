import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cloud, MessageCircle, Pencil, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { z } from "zod";
import { deleteSubmissionCommentAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { Notice } from "@/components/notice";
import { ReviewEditor } from "@/components/review-editor";
import { SpoilerText } from "@/components/spoiler-text";
import { getCurrentUser } from "@/lib/auth";
import { categoryLabels, contentStatusLabel, submissionKind } from "@/lib/config";
import { getPublicSubmissionDetail } from "@/lib/data";
import { safePageNumber } from "@/lib/security";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "作品详情与评论" };

export default async function PublicSubmissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string; reviewPage?: string }> }) {
  const [{ id: rawId }, messages, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const id = z.uuid().safeParse(rawId);
  if (!id.success) notFound();
  const requestedReviewPage = safePageNumber(messages.reviewPage);
  const detail = await getPublicSubmissionDetail(id.data, user?.id, requestedReviewPage);
  if (!detail) notFound();
  const { item, isAuthor, reviews, ownReview, reviewPage, reviewHasMore } = detail;
  const isHostRecommended = item.source === "host" || !!item.pinnedAt;
  const kind = submissionKind(item.category);
  const backPath = kind === "food" ? "/food#feed" : kind === "wish" ? "/wishes#feed" : "/#feed";
  const positiveLabel = kind === "wish" ? "支持" : "推荐";
  const negativeLabel = kind === "wish" ? "暂不支持" : "不推荐";

  return <div className="submission-detail-page page-shell">
    <Link className="back-link" href={backPath}>← 返回{kind === "food" ? "美食家" : kind === "wish" ? "许愿箱" : "推荐单"}</Link>
    <Notice>{messages.error}</Notice><Notice type="success">{messages.success}</Notice>
    <article className="panel public-submission-detail">
      <div className="card-top"><span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span>{item.pinnedAt ? <span className="pin">置顶</span> : null}{isHostRecommended ? <span className="host-badge">{kind === "wish" ? item.source === "host" ? "直播预告" : "预定要做" : item.source === "host" ? "神绮爱原创" : "神绮爱推荐"}</span> : null}<span className="detail-card-actions">{isAuthor ? <Link className="author-edit-icon" href={`/me/submissions#submission-${item.id}`} aria-label="编辑我的内容" title="编辑我的内容"><Pencil aria-hidden="true"/></Link> : null}<span className="status">{contentStatusLabel(item.category, item.contentStatus)}</span></span></div>
      <div className="detail-title-row"><div><h1>{item.title}</h1><p>{item.source === "host" ? kind === "wish" ? "由神绮爱发布" : "由神绮爱撰写" : `由 ${item.submitter} ${kind === "wish" ? "许愿" : "推荐"}`} · 公开于 {formatDate(item.publishedAt)}</p></div>{item.score && kind !== "wish" ? <span className="score"><b>{item.score}</b><small>/10</small></span> : null}</div>
      {item.description ? <p className="description detail-description"><BvText>{item.description}</BvText></p> : <p className="description muted">{kind === "wish" ? "没有补充愿望说明。" : "暂无推荐理由。"}</p>}
      {item.externalUrl ? <a className="external-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer nofollow">查看相关链接 ↗</a> : null}
      {item.pinNote ? <div className="pin-note"><strong>{kind === "wish" ? "预定说明" : "神绮爱推荐语"}</strong><BvText>{item.pinNote}</BvText></div> : null}
      {item.reply ? <div className="host-reply"><div className="reply-title"><span className="avatar">爱</span><strong>{kind === "wish" ? "神绮爱回应" : kind === "food" ? "神绮爱试吃感想" : "神绮爱感想"}</strong></div><p><BvText>{item.reply}</BvText></p><time>记录于 {formatDate(item.replyPublishedAt)}</time></div> : null}
    </article>

    <section className="community-review-summary panel" aria-labelledby="community-review-title">
      <div><span className="eyebrow">Community score</span><h2 id="community-review-title">{kind === "wish" ? "大家也想要" : "大家的推荐"}</h2><p>每个账号一票，正反票相减得到净支持数。</p></div>
      <div className={`community-score-large ${item.communityScore < 0 ? "is-negative" : ""}`}><ThumbsUp aria-hidden="true"/><strong>{item.communityScore > 0 ? `+${item.communityScore}` : item.communityScore}</strong><span>{kind === "wish" ? "净支持数" : "净推荐数"}</span></div>
      <div className="community-breakdown"><span><ThumbsUp aria-hidden="true"/>{item.recommendCount} 人{positiveLabel}</span><span><ThumbsDown aria-hidden="true"/>{item.notRecommendCount} 人{negativeLabel}</span></div>
    </section>

    {!ownReview?.comment ? <section className="review-compose-section">
      <div className="section-heading"><div><span className="eyebrow">Your review</span><h2>{kind === "wish" ? "表达你的支持" : "写下你的评价"}</h2></div></div>
      {user ? <ReviewEditor submissionId={item.id} kind={kind} initial={ownReview}/> : <div className="panel review-login-callout"><p>登录后可以单独{kind === "wish" ? "支持或留言" : "推荐或评论"}。</p><Link className="button primary" href="/login">登录评价</Link></div>}
    </section> : null}

    <section className="community-comments" id="comments" aria-labelledby="community-comments-title">
      <div className="section-heading"><div><span className="eyebrow">User reviews</span><h2 id="community-comments-title">{kind === "wish" ? "愿望留言" : "用户评论"}</h2></div><span className="comment-count"><MessageCircle aria-hidden="true"/>{item.commentCount} 条文字评论</span></div>
      <div className="community-comment-list">
        {ownReview?.comment && user ? <article className={`panel community-comment-card own-community-review ${ownReview.recommend === true ? "is-recommended" : ownReview.recommend === false ? "is-not-recommended" : "is-comment-only"}`}>
          <header><span className="review-author review-author-own">{user.username}<small>我的评论</small></span><span className="review-verdict">{ownReview.recommend === true ? <><ThumbsUp aria-hidden="true"/>{positiveLabel}</> : ownReview.recommend === false ? <><ThumbsDown aria-hidden="true"/>{negativeLabel}</> : <><MessageCircle aria-hidden="true"/>仅评论</>}</span></header>
          <SpoilerText className="community-comment-copy">{ownReview.comment}</SpoilerText>
          <footer>更新于 {formatDate(ownReview.updatedAt)}</footer>
          <div className="own-review-actions">
            <details className="own-review-edit"><summary><Pencil aria-hidden="true"/>修改</summary><ReviewEditor submissionId={item.id} kind={kind} initial={ownReview}/></details>
            <form action={deleteSubmissionCommentAction}><input name="submissionId" type="hidden" value={item.id}/><button className="button small danger" type="submit"><X aria-hidden="true"/>删除评论</button></form>
          </div>
        </article> : null}
        {reviews.map((review) => <article className={`panel community-comment-card ${review.recommend === true ? "is-recommended" : review.recommend === false ? "is-not-recommended" : "is-comment-only"}`} key={review.id}>
        <header><span className="review-author">{review.username}</span><span className="review-verdict">{review.recommend === true ? <><ThumbsUp aria-hidden="true"/>{positiveLabel}</> : review.recommend === false ? <><ThumbsDown aria-hidden="true"/>{negativeLabel}</> : <><MessageCircle aria-hidden="true"/>仅评论</>}</span></header>
        <SpoilerText className="community-comment-copy">{review.comment ?? ""}</SpoilerText>
        <footer>评价于 {formatDate(review.updatedAt)}</footer>
      </article>)}</div>
      {!ownReview?.comment && !reviews.length ? <div className="empty-state"><Cloud aria-hidden="true"/><h3>还没有评论</h3></div> : null}
      {(reviewPage > 1 || reviewHasMore) ? <nav className="marshmallow-pagination" aria-label="评论分页">{reviewPage > 1 ? <Link className="button ghost" href={`/submission/${item.id}?reviewPage=${reviewPage - 1}#comments`}>← 上一页</Link> : <span/>}<strong>第 {reviewPage} 页</strong>{reviewHasMore ? <Link className="button ghost" href={`/submission/${item.id}?reviewPage=${reviewPage + 1}#comments`}>下一页 →</Link> : <span/>}</nav> : null}
    </section>
  </div>;
}
