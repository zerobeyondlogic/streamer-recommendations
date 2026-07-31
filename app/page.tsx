import Link from "next/link";
import { BvText } from "@/components/bv-text";
import { Notice } from "@/components/notice";
import { categories, categoryLabels, contentStatusLabel, contentStatuses, type Category, type FeedSort } from "@/lib/config";
import { getPublicFeed, getSettings } from "@/lib/data";
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
  const sort: FeedSort = one(params.sort) === "score" ? "score" : "time";
  const hostRecommended = one(params.hostRecommended) === "1";
  const page = Math.max(1, Number(one(params.page)) || 1);
  const [feed, settings] = await Promise.all([getPublicFeed({ category, status, q, sort, hostRecommended, page }), getSettings()]);
  const sectionTitle = category ? `${categoryLabels[category]}推荐` : "大家最近在安利什么";
  const nextPage = new URLSearchParams({ ...(category ? { category } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}), sort, ...(hostRecommended ? { hostRecommended: "1" } : {}), page: String(page + 1) });

  return <div className="page-shell">
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow">观众投稿 · 主播原创 · 一起交流</span><h1>下一部让人眼睛发亮的作品，<em>也许就在这里。</em></h1><p>{settings.siteTagline}</p><div className="hero-actions"><Link className="button primary" href="/submit">推荐一个作品 <span>→</span></Link><a className="button ghost" href="#feed">逛逛推荐库</a></div></div>
      <div className="hero-art" aria-hidden="true"><div className="sun">✦</div><div className="shelf"><span>书</span><span>漫</span><span>影</span><span>动</span><span>游</span></div><div className="bubble bubble-a">好耶！</div><div className="bubble bubble-b">主播也来安利</div></div>
    </section>
    <section id="feed" className="feed-section">
      <div className="section-heading"><div><span className="eyebrow">{category ? `${categoryLabels[category]}专栏` : "首页 · 综合时间流"}</span><h2>{sectionTitle}</h2></div><span className="live-dot"><i /> 置顶始终优先</span></div>
      <form className="filters feed-filters" action="/" method="get">
        <label>作品名称搜索<input name="q" defaultValue={q} placeholder="输入作品名称…" maxLength={100} /></label>
        <label>分类<select name="category" defaultValue={category ?? ""}><option value="">首页 · 全部</option>{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></label>
        <label>作品状态<select name="status" defaultValue={status}><option value="">全部状态</option>{contentStatuses.map((item) => <option key={item} value={item}>{item === "pending" ? "待体验" : item === "in_progress" ? "进行中" : item === "completed" ? "已完成 / 已玩" : "已放弃"}</option>)}</select></label>
        <label>排序<select name="sort" defaultValue={sort}><option value="time">最近动态</option><option value="score">评分从高到低</option></select></label>
        <label className="checkbox compact host-only-filter"><input name="hostRecommended" value="1" type="checkbox" defaultChecked={hostRecommended} /><span>只看主播推荐</span></label>
        <button className="button small primary" type="submit">筛选</button><Link href={category ? `/?category=${category}` : "/"} className="button small ghost">清空</Link>
      </form>
      {!process.env.DATABASE_URL ? <Notice type="info">网站代码已准备好。站长配置 Neon 数据库并执行迁移后，投稿时间流就会在这里开始生长。</Notice> : null}
      <div className="feed-grid">
        {feed.map((item) => {
          const isHostRecommended = item.source === "host" || !!item.pinnedAt;
          return <article className={`feed-card ${item.pinnedAt ? "is-pinned" : ""} ${item.source === "host" ? "is-host-authored" : ""}`} key={item.id} id={item.id}>
            <div className="card-top"><span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span>{item.pinnedAt ? <span className="pin">置顶</span> : null}{isHostRecommended ? <span className="host-badge">{item.source === "host" ? "主播原创" : "主播推荐"}</span> : null}<span className="status">{contentStatusLabel(item.category, item.contentStatus)}</span></div>
            <div className="title-row"><h3>{item.title}</h3>{item.score ? <span className="score"><b>{item.score}</b><small>/10</small></span> : null}</div>
            {item.description ? <p className="description"><BvText>{item.description}</BvText></p> : <p className="description muted">这里留了一点空白，等主播亲自发现。</p>}
            {item.externalUrl ? <a className="external-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer nofollow">查看相关链接 ↗</a> : null}
            {item.pinNote ? <div className="pin-note"><strong>主播推荐语</strong><BvText>{item.pinNote}</BvText></div> : null}
            {item.reply ? <div className="host-reply"><div className="reply-title"><span className="avatar">主</span><strong>主播感想</strong></div><p><BvText>{item.reply}</BvText></p><time>记录于 {formatDate(item.replyPublishedAt)}</time></div> : <div className="waiting-reply">{item.source === "host" ? "主播暂时还没写体验感想" : "主播还在体验中，感想正在路上"}</div>}
            <footer><span>{item.source === "host" ? "由主播撰写推荐" : `由 ${item.submitter} 推荐`}</span><span>最初记录于 {formatDate(item.createdAt)}</span><span>公开于 {formatDate(item.publishedAt)}</span></footer>
          </article>;
        })}
      </div>
      {feed.length === 0 ? <div className="empty-state"><span>☁︎</span><h3>这里还很安静</h3><p>换个条件，或者成为第一个投递好作品的人吧。</p><Link className="button primary" href="/submit">去投稿</Link></div> : null}
      {feed.length === 20 ? <div className="pagination"><Link className="button ghost" href={`/?${nextPage}`}>加载更多</Link></div> : null}
    </section>
  </div>;
}
