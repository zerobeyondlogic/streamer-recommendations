import type { Metadata } from "next";
import Link from "next/link";
import { getHostStats } from "@/lib/data";
export const metadata: Metadata = { title: "神绮爱工作台" };
export default async function HostDashboard() {
  const [newCount,pending,progress,completed,pinned,unread,marshmallowCount] = await getHostStats();
  const stats=[['新投稿',newCount,'/host/inbox?read=unread','✉'],['待展示棉花糖',marshmallowCount,'/host/marshmallows','☁'],['待体验',pending,'/host/library?status=pending','◷'],['进行中',progress,'/host/library?status=in_progress','▶'],['已完成',completed,'/host/library?status=completed','✓'],['当前置顶',pinned,'/host/library?pinned=1','📌'],['未读通知',unread,'/host','◉']];
  return <><header className="host-heading"><div><span className="eyebrow">今日概览</span><h1>管理推荐，也分享你的喜欢</h1><p>观众投稿首次打开后公开；神绮爱原创推荐则可直接发布、评分和置顶。</p></div><div className="hero-actions"><Link className="button ghost" href="/host/inbox">处理新投稿</Link><Link className="button primary" href="/host/recommend">撰写原创推荐 →</Link></div></header><div className="stats-grid">{stats.map(([label,value,href,icon])=><Link className="stat-card" href={String(href)} key={String(label)}><span>{icon}</span><strong>{value}</strong><small>{label}</small></Link>)}</div><section className="panel quick-guide"><h2>两种推荐如何进入首页</h2><ol><li><b>1</b><span><strong>观众投稿</strong><small>首次打开后公开，可回复与评分</small></span></li><li><b>2</b><span><strong>神绮爱原创</strong><small>撰写完成后直接进入推荐库</small></span></li><li><b>3</b><span><strong>置顶优先</strong><small>时间和评分排序都始终先显示置顶</small></span></li></ol></section></>;
}
