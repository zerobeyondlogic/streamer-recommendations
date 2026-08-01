import type { Metadata } from "next";
import Link from "next/link";
import { getHostStats } from "@/lib/data";
export const metadata: Metadata = { title: "神绮爱工作台" };
export default async function HostDashboard() {
  const [newCount,pending,progress,completed,pinned,unread,marshmallowCount] = await getHostStats();
  const stats=[['新投稿',newCount,'/host/inbox?read=unread','✉'],['待展示棉花糖',marshmallowCount,'/host/marshmallows','☁'],['待体验',pending,'/host/library?status=pending','◷'],['进行中',progress,'/host/library?status=in_progress','▶'],['已完成',completed,'/host/library?status=completed','✓'],['当前置顶',pinned,'/host/library?pinned=1','📌'],['未读通知',unread,'/host','◉']];
  return <><header className="host-heading"><div><span className="eyebrow">今日概览</span><h1>神绮爱工作台</h1><p>管理投稿、棉花糖与推荐。</p></div><div className="hero-actions"><Link className="button ghost" href="/host/inbox">处理投稿</Link><Link className="button primary" href="/host/recommend">写推荐 →</Link></div></header><div className="stats-grid">{stats.map(([label,value,href,icon])=><Link className="stat-card" href={String(href)} key={String(label)}><span>{icon}</span><strong>{value}</strong><small>{label}</small></Link>)}</div></>;
}
