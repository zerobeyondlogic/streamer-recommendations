import Link from "next/link";
import { BookOpen, Cloud, Sparkles, ThumbsUp, Utensils } from "lucide-react";
import { BvText } from "@/components/bv-text";
import { Notice } from "@/components/notice";
import { FilterSelect } from "@/components/filter-select";
import { MobileFilterDisclosure } from "@/components/mobile-filter-disclosure";
import {
  categories, categoryLabels, contentStatusLabel, contentStatuses, feedSorts, submissionKind,
  type Category, type FeedSort, type SubmissionKind,
} from "@/lib/config";
import { getPublicFeed, getSiteCopy } from "@/lib/data";
import { safePageNumber } from "@/lib/security";
import { formatDate } from "@/lib/view";

type SearchParams = Record<string, string | string[] | undefined>;
const workCategories = categories.filter((category) => submissionKind(category) === "work");

const copy = {
  work: { eyebrow: "Recommendation list", title: "把喜欢的作品，推荐给神绮爱。", description: "书籍、漫画、电影、动漫和游戏都可以投稿。", section: "最近的作品推荐", search: "作品名称", placeholder: "搜索作品…", submit: "推荐一个作品", empty: "没有找到作品", emptyCopy: "换个条件试试。", reply: "神绮爱感想" },
  food: { eyebrow: "Food guide", title: "好吃的，当然要一起分享。", description: "推荐值得一吃的店铺、菜品和味道。", section: "大家的美食推荐", search: "店铺或菜品", placeholder: "搜索店铺、菜品…", submit: "推荐一份美食", empty: "还没有美食推荐", emptyCopy: "来分享第一份好吃的。", reply: "神绮爱试吃感想" },
  wish: { eyebrow: "Wish box", title: "下一次直播，想和神绮爱做什么？", description: "许愿台词回读、一起看作品，或任何直播企划。审核通过后大家可以一起支持。", section: "等待实现的愿望", search: "愿望关键词", placeholder: "搜索愿望…", submit: "投递一个愿望", empty: "许愿箱还空着", emptyCopy: "写下第一个直播愿望吧。", reply: "神绮爱回应" },
} satisfies Record<SubmissionKind, Record<string, string>>;

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function basePath(kind: SubmissionKind) { return kind === "work" ? "/" : kind === "food" ? "/food" : "/wishes"; }

export async function PublicFeedPage({ kind, searchParams }: { kind: SubmissionKind; searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const rawCategory = one(params.category);
  const category = kind === "work" && workCategories.includes(rawCategory as Category) ? rawCategory as Category : undefined;
  const rawStatus = one(params.status);
  const allowedStatuses = kind === "wish" ? contentStatuses.filter((status) => status === "pending" || status === "completed") : contentStatuses;
  const status = allowedStatuses.includes(rawStatus as never) ? rawStatus : "";
  const q = one(params.q).slice(0, 100);
  const rawSort = one(params.sort);
  const sort: FeedSort = feedSorts.includes(rawSort as FeedSort) && !(kind === "wish" && rawSort === "score") ? rawSort as FeedSort : "time";
  const hostRecommended = one(params.hostRecommended) === "1";
  const page = safePageNumber(one(params.page));
  const [siteCopy, feed] = await Promise.all([
    getSiteCopy(),
    getPublicFeed({ kind, category, status, q, sort, hostRecommended, page }),
  ]);
  const pageCopy = kind === "work"
    ? { ...copy.work, title: `${siteCopy.recommendationHeroTitle}${siteCopy.recommendationHeroAccent}`, description: siteCopy.recommendationTagline, section: siteCopy.recommendationSectionTitle }
    : kind === "food"
      ? { ...copy.food, title: siteCopy.foodHeroTitle, description: siteCopy.foodTagline, section: siteCopy.foodSectionTitle }
      : { ...copy.wish, title: siteCopy.wishHeroTitle, description: siteCopy.wishTagline, section: siteCopy.wishSectionTitle };
  const root = basePath(kind);
  const nextPage = new URLSearchParams({ ...(category ? { category } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}), sort, ...(hostRecommended ? { hostRecommended: "1" } : {}), page: String(page + 1) });
  const activeFilterCount = Number(Boolean(q)) + Number(Boolean(category)) + Number(Boolean(status)) + Number(sort !== "time") + Number(hostRecommended);
  const fixedCategory = kind === "food" ? "food" : kind === "wish" ? "wish" : undefined;
  const rangeLabel = kind === "wish" ? "直播安排" : "推荐范围";
  const rangeOptionLabel = kind === "wish" ? "预定要做的" : "只看神绮爱推荐";
  return <div className={`page-shell collection-page collection-${kind}`}>
    <section className="collection-hero">
      <div className="collection-hero-mark" aria-hidden="true">{kind === "work" ? <BookOpen/> : kind === "food" ? <Utensils/> : <Sparkles/>}</div>
      <div><span className="eyebrow">{pageCopy.eyebrow}</span><h1>{kind === "work" ? <>{siteCopy.recommendationHeroTitle}<em>{siteCopy.recommendationHeroAccent}</em></> : pageCopy.title}</h1><p>{pageCopy.description}</p><div className="hero-actions"><Link className="button primary" href={kind === "work" ? "/submit" : `/submit?kind=${kind}`}>{pageCopy.submit} <span>→</span></Link><a className="button ghost" href="#feed">{kind === "work" ? "浏览推荐单" : "看看大家的投稿"}</a></div></div>
    </section>

    <section id="feed" className="feed-section">
      <div className="section-heading"><div><span className="eyebrow">{kind === "work" ? category ? `${categoryLabels[category]}专栏` : "推荐单 · 综合" : kind === "food" ? "美食家" : "许愿箱"}</span><h2>{kind === "work" && category ? `${categoryLabels[category]}推荐` : pageCopy.section}</h2></div><span className="live-dot"><i/> {kind === "wish" ? "未完成优先" : "置顶始终优先"}</span></div>
      <MobileFilterDisclosure activeFilterCount={activeFilterCount}>
        <form className={`filters feed-filters feed-filters-${kind}`} action={root} method="get" data-testid="feed-filters">
          <label>{pageCopy.search}<input name="q" defaultValue={q} placeholder={pageCopy.placeholder} maxLength={100}/></label>
          {kind === "work" ? <FilterSelect name="category" label="分类" defaultValue={category ?? ""} options={[{ value: "", label: "全部" }, ...workCategories.map((item) => ({ value: item, label: categoryLabels[item] }))]}/> : null}
          <FilterSelect name="status" label={kind === "wish" ? "完成状态" : kind === "food" ? "打卡状态" : "作品状态"} defaultValue={status} options={[{ value: "", label: "全部状态" }, ...allowedStatuses.map((item) => ({ value: item, label: fixedCategory ? contentStatusLabel(fixedCategory, item) : item === "pending" ? "待体验" : item === "in_progress" ? "进行中" : item === "completed" ? "已完成 / 已玩" : "已放弃" }))]}/>
          <FilterSelect name="sort" label="排序" defaultValue={sort} options={[{ value: "time", label: "最近动态" }, ...(kind !== "wish" ? [{ value: "score", label: "神绮爱评分" }] : []), { value: "community", label: kind === "wish" ? "支持人数" : "社区推荐数" }]}/>
          <label className="host-recommend-filter"><span>{rangeLabel}</span><span className="check-surface"><input name="hostRecommended" value="1" type="checkbox" defaultChecked={hostRecommended}/><span>{rangeOptionLabel}</span></span></label>
          <button className="button small primary" type="submit">筛选</button><Link href={category ? `/?category=${category}` : root} className="button small ghost">清空</Link>
        </form>
      </MobileFilterDisclosure>
      {!process.env.DATABASE_URL ? <Notice type="info">数据库连接后，投稿会显示在这里。</Notice> : null}
      <div className="feed-grid">
        {feed.map((item) => {
          const isHostRecommended = item.source === "host" || !!item.pinnedAt;
          const itemKind = submissionKind(item.category);
          return <article className={`feed-card feed-card-${itemKind} ${item.pinnedAt ? "is-pinned" : ""} ${item.source === "host" ? "is-host-authored" : ""}`} key={item.id} id={item.id}>
            <Link className="feed-card-hit-area" href={`/submission/${item.id}`} aria-label={`查看 ${item.title} 的详情`}/>
            <div className="card-top"><span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span>{item.pinnedAt ? <span className="pin">置顶</span> : null}{isHostRecommended ? <span className="host-badge">{itemKind === "wish" ? item.source === "host" ? "直播预告" : "预定要做" : item.source === "host" ? "神绮爱原创" : "神绮爱推荐"}</span> : null}<span className="status">{contentStatusLabel(item.category, item.contentStatus)}</span></div>
            <div className="title-row"><h3><Link className="submission-title-link" href={`/submission/${item.id}`}>{item.title}</Link></h3>{item.score && item.category !== "wish" ? <span className="score"><b>{item.score}</b><small>/10</small></span> : null}</div>
            {item.description ? <p className="description"><BvText>{item.description}</BvText></p> : <p className="description muted">{itemKind === "wish" ? "没有补充愿望说明。" : "暂无推荐理由。"}</p>}
            {item.externalUrl ? <a className="external-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer nofollow">查看相关链接 ↗</a> : null}
            {item.pinNote ? <div className="pin-note"><strong>{itemKind === "wish" ? "预定说明" : "神绮爱推荐语"}</strong><BvText>{item.pinNote}</BvText></div> : null}
            {item.reply ? <div className="host-reply"><div className="reply-title"><span className="avatar">爱</span><strong>{copy[itemKind].reply}</strong></div><p><BvText>{item.reply}</BvText></p><time>{formatDate(item.replyPublishedAt)}</time></div> : itemKind === "wish" ? <div className="waiting-reply">等待神绮爱回应</div> : null}
            <footer><span>{item.source === "host" ? itemKind === "wish" ? "由神绮爱发布" : "由神绮爱撰写" : `由 ${item.submitter} ${itemKind === "wish" ? "许愿" : "推荐"}`}</span><span>记录于 {formatDate(item.createdAt)}</span><span>公开于 {formatDate(item.publishedAt)}</span><Link className={`community-score-link ${item.communityScore < 0 ? "is-negative" : ""}`} href={`/submission/${item.id}`} aria-label={`查看详情，${itemKind === "wish" ? "净支持数" : "净推荐数"} ${item.communityScore}`}><ThumbsUp aria-hidden="true"/><b>{item.communityScore > 0 ? `+${item.communityScore}` : item.communityScore}</b></Link></footer>
          </article>;
        })}
      </div>
      {feed.length === 0 ? <div className="empty-state"><Cloud aria-hidden="true"/><h3>{pageCopy.empty}</h3><p>{pageCopy.emptyCopy}</p><Link className="button primary" href={`/submit${kind === "work" ? "" : `?kind=${kind}`}`}>{pageCopy.submit}</Link></div> : null}
      {feed.length === 20 ? <div className="pagination"><Link className="button ghost" href={`${root}?${nextPage}`}>加载更多</Link></div> : null}
    </section>
  </div>;
}
