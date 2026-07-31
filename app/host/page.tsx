import type { Metadata } from "next";
import Link from "next/link";
import { getHostStats } from "@/lib/data";
export const metadata: Metadata = { title: "主播工作台" };
export default async function HostDashboard() {
  const [newCount,pending,progress,completed,pinned,unread] = await getHostStats();
  const stats=[['新投稿',newCount,'/host/inbox?read=unread','✉'],['待体验',pending,'/host/library?status=pending','◷'],['进行中',progress,'/host/library?status=in_progress','▶'],['已完成',completed,'/host/library?status=completed','✓'],['当前置顶',pinned,'/host/library?pinned=1','📌'],['未读通知',unread,'/host','◉']];
  return <><header className="host-heading"><div><span className="eyebrow">今日概览</span><h1>嗨，看看收件箱吧</h1><p>打开一条新投稿会自动标记“投稿已查看”，并在同一事务中首次公开。</p></div><Link className="button primary" href="/host/inbox">处理新投稿 →</Link></header><div className="stats-grid">{stats.map(([label,value,href,icon])=><Link className="stat-card" href={String(href)} key={String(label)}><span>{icon}</span><strong>{value}</strong><small>{label}</small></Link>)}</div><section className="panel quick-guide"><h2>一条推荐如何流动</h2><ol><li><b>1</b><span><strong>观众投稿</strong><small>只有主播能看见未处理内容</small></span></li><li><b>2</b><span><strong>主播首次打开</strong><small>标记已查看并自动公开</small></span></li><li><b>3</b><span><strong>体验并发表感想</strong><small>卡片回到时间流前面，通知投稿者</small></span></li></ol></section></>;
}
