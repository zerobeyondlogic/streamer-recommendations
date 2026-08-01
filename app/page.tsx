import Link from "next/link";
import { ThumbsUp } from "lucide-react";
import { BvText } from "@/components/bv-text";
import { Notice } from "@/components/notice";
import { FilterSelect } from "@/components/filter-select";
import { MobileFilterDisclosure } from "@/components/mobile-filter-disclosure";
import { categories, categoryLabels, contentStatusLabel, contentStatuses, feedSorts, type Category, type FeedSort } from "@/lib/config";
import { getPublicFeed } from "@/lib/data";
import { formatDate } from "@/lib/view";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawCategory = one(params.category);
  const category = categories.includes(rawCategory as Category) ? rawCategory as Category : undefined;
  const rawStatus = one(params.status);
  const status = contentStatuses.includes(rawStatus as never) ? rawStatus : "";
  const q = one(params.q);
  const rawSort = one(params.sort);
  const sort: FeedSort = feedSorts.includes(rawSort as FeedSort) ? rawSort as FeedSort : "time";
  const hostRecommended = one(params.hostRecommended) === "1";
  const page = Math.max(1, Number(one(params.page)) || 1);
  const feed = await getPublicFeed({ category, status, q, sort, hostRecommended, page });
  const sectionTitle = category ? `${categoryLabels[category]}推荐` : "最近的作品推荐";
  const nextPage = new URLSearchParams({ ...(category ? { category } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}), sort, ...(hostRecommended ? { hostRecommended: "1" } : {}), page: String(page + 1) });
  const activeFilterCount = Number(Boolean(q)) + Number(Boolean(category)) + Number(Boolean(status)) + Number(sort !== "time") + Number(hostRecommended);

  return <div className="page-shell">
    <section className="hero">
      <div className="hero-copy"><h1>把喜欢的作品，<em>推荐给神绮爱。</em></h1><p>书籍、漫画、电影、动漫和游戏都可以投稿。</p><div className="hero-actions"><Link className="button primary" href="/submit">推荐一个作品 <span>→</span></Link><a className="button ghost" href="#feed">浏览推荐库</a></div></div>
      <div className="hero-art" aria-hidden="true"><div className="sun">✦</div><div className="shelf"><span>书籍</span><span>漫画</span><span>电影</span><span>动漫</span><span>游戏</span></div><div className="bubble bubble-a">好耶！</div><div className="bubble bubble-b">给神绮爱的安利</div></div>
    </section>
    <section id="feed" className="feed-section">
      <div className="section-heading"><div><span className="eyebrow">{category ? `${categoryLabels[category]}专栏` : "首页 · 综合时间流"}</span><h2>{sectionTitle}</h2></div><span className="live-dot"><i /> 置顶始终优先</span></div>
      <MobileFilterDisclosure activeFilterCount={activeFilterCount}>
      <form className="filters feed-filters" action="/" method="get" data-testid="feed-filters">
        <label>作品名称<input name="q" defaultValue={q} placeholder="搜索作品…" maxLength={100} /></label>
        <FilterSelect name="category" label="分类" defaultValue={category ?? ""} options={[{ value: "", label: "首页 · 全部" }, ...categories.map((item) => ({ value: item, label: categoryLabels[item] }))]} />
        <FilterSelect name="status" label="作品状态" defaultValue={status} options={[{ value: "", label: "全部状态" }, ...contentStatuses.map((item) => ({ value: item, label: item === "pending" ? "待体验" : item === "in_progress" ? "进行中" : item === "completed" ? "已完成 / 已玩" : "已放弃" }))]} />
        <FilterSelect name="sort" label="排序" defaultValue={sort} options={[{ value: "time", label: "最近动态" }, { value: "score", label: "神绮爱评分" }, { value: "community", label: "社区推荐数" }]} />
        <label className="host-recommend-filter"><span>推荐范围</span><span className="check-surface"><input name="hostRecommended" value="1" type="checkbox" defaultChecked={hostRecommended} /><span>只看神绮爱推荐</span></span></label>
        <button className="button small primary" type="submit">筛选</button><Link href={category ? `/?category=${category}` : "/"} className="button small ghost">清空</Link>
      </form></MobileFilterDisclosure>
      {!process.env.DATABASE_URL ? <Notice type="info">网站代码已准备好。站长配置 Neon 数据库并执行迁移后，投稿时间流就会在这里开始生长。</Notice> : null}
      <div className="feed-grid">
        {feed.map((item) => {
          const isHostRecommended = item.source === "host" || !!item.pinnedAt;
          return <article className={`feed-card ${item.pinnedAt ? "is-pinned" : ""} ${item.source === "host" ? "is-host-authored" : ""}`} key={item.id} id={item.id}>
            <div className="card-top"><span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span>{item.pinnedAt ? <span className="pin">置顶</span> : null}{isHostRecommended ? <span className="host-badge">{item.source === "host" ? "神绮爱原创" : "神绮爱推荐"}</span> : null}<span className="status">{contentStatusLabel(item.category, item.contentStatus)}</span></div>
            <div className="title-row"><h3><Link className="submission-title-link" href={`/submission/${item.id}`}>{item.title}</Link></h3>{item.score ? <span className="score"><b>{item.score}</b><small>/10</small></span> : null}</div>
            {item.description ? <p className="description"><BvText>{item.description}</BvText></p> : <p className="description muted">暂无推荐理由。</p>}
            {item.externalUrl ? <a className="external-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer nofollow">查看相关链接 ↗</a> : null}
            {item.pinNote ? <div className="pin-note"><strong>神绮爱推荐语</strong><BvText>{item.pinNote}</BvText></div> : null}
            {item.reply ? <div className="host-reply"><div className="reply-title"><span className="avatar">爱</span><strong>神绮爱感想</strong></div><p><BvText>{item.reply}</BvText></p><time>{formatDate(item.replyPublishedAt)}</time></div> : <div className="waiting-reply">暂无感想</div>}
            <footer><span>{item.source === "host" ? "由神绮爱撰写推荐" : `由 ${item.submitter} 推荐`}</span><span>最初记录于 {formatDate(item.createdAt)}</span><span>公开于 {formatDate(item.publishedAt)}</span><Link className={`community-score-link ${item.communityScore < 0 ? "is-negative" : ""}`} href={`/submission/${item.id}`} aria-label={`查看作品详情，净推荐数 ${item.communityScore}`}><ThumbsUp aria-hidden="true"/><b>{item.communityScore > 0 ? `+${item.communityScore}` : item.communityScore}</b></Link></footer>
          </article>;
        })}
      </div>
      {feed.length === 0 ? <div className="empty-state"><span>☁︎</span><h3>没有找到作品</h3><p>换个条件试试。</p><Link className="button primary" href="/submit">去投稿</Link></div> : null}
      {feed.length === 20 ? <div className="pagination"><Link className="button ghost" href={`/?${nextPage}`}>加载更多</Link></div> : null}
    </section>
  </div>;
}
