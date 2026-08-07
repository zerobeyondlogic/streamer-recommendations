import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Check, Cloud, Inbox, MessageCircleMore, Pin, Play, Timer } from "lucide-react";
import { getHostStats } from "@/lib/data";
export const metadata: Metadata = { title: "工作台" };
export default async function HostDashboard() {
  const [newCount,pending,progress,completed,pinned,unread,marshmallowCount,hostMusingCount] = await getHostStats();
  const stats=[
    {label:'新投稿',value:newCount,href:'/host/inbox?read=unread',Icon:Inbox},
    {label:'待展示棉花糖',value:marshmallowCount,href:'/host/marshmallows',Icon:Cloud},
    {label:'已发布碎碎念',value:hostMusingCount,href:'/host/musings',Icon:MessageCircleMore},
    {label:'待体验',value:pending,href:'/host/library?status=pending',Icon:Timer},
    {label:'进行中',value:progress,href:'/host/library?status=in_progress',Icon:Play},
    {label:'已完成',value:completed,href:'/host/library?status=completed',Icon:Check},
    {label:'当前置顶',value:pinned,href:'/host/library?pinned=1',Icon:Pin},
    {label:'未读通知',value:unread,href:'/host',Icon:Bell},
  ];
  return <><header className="host-heading"><div><span className="eyebrow">今日概览</span><h1>工作台</h1><p>先处理待办，再管理已公开内容。</p></div><div className="hero-actions"><Link className="button ghost" href="/host/inbox">处理投稿</Link><Link className="button primary" href="/host/recommend">新建内容</Link></div></header><div className="stats-grid">{stats.map(({label,value,href,Icon})=><Link className="stat-card" href={href} key={label}><span><Icon aria-hidden="true"/></span><strong>{value}</strong><small>{label}</small></Link>)}</div></>;
}
