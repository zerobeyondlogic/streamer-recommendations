"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cloud, DatabaseBackup, Home, Inbox, LayoutDashboard, Library, MessageCircleMore, MonitorPlay, Paintbrush, Plus, Sparkles, UsersRound } from "lucide-react";

const groups = [
  {
    label: "内容中心",
    items: [
      { href: "/host/inbox", label: "投稿审核", Icon: Inbox },
      { href: "/host/library", label: "内容库", Icon: Library },
    ],
  },
  {
    label: "主播内容",
    items: [
      { href: "/host/musings", label: "碎碎念", Icon: MessageCircleMore },
    ],
  },
  {
    label: "棉花糖",
    items: [
      { href: "/host/marshmallows", label: "收件箱", Icon: Cloud, exact: true },
      { href: "/host/marshmallows/stage", label: "展示台", Icon: MonitorPlay },
    ],
  },
  {
    label: "站点管理",
    items: [
      { href: "/host/users", label: "用户", Icon: UsersRound },
      { href: "/host/theme", label: "页面设置", Icon: Paintbrush },
      { href: "/host/backup", label: "数据与备份", Icon: DatabaseBackup },
    ],
  },
] as const;

export function HostSidebar({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const isActive = (href: string, exact = false) => exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return <aside className="host-sidebar">
    <div className="host-sidebar-brand"><span className="host-sidebar-mark"><Sparkles aria-hidden="true"/></span><span><strong>主播工作台</strong><small>{siteName}</small></span></div>
    <details className="host-create-menu">
      <summary><Plus aria-hidden="true"/>新建内容</summary>
      <div><Link href="/host/recommend">推荐单</Link><Link href="/host/recommend?kind=wish">许愿箱</Link><Link href="/host/recommend?kind=food">美食家</Link><Link href="/host/musings">碎碎念</Link></div>
    </details>
    <nav aria-label="工作台导航">
      <Link className={pathname === "/host" ? "is-active" : ""} href="/host"><LayoutDashboard aria-hidden="true"/><span>概览</span></Link>
      {groups.map((group) => <section className="host-nav-group" key={group.label} aria-labelledby={`host-nav-${group.label}`}>
        <h2 id={`host-nav-${group.label}`}>{group.label}</h2>
        {group.items.map(({ href, label, Icon, ...item }) => <Link className={isActive(href, "exact" in item && item.exact) ? "is-active" : ""} href={href} key={href}><Icon aria-hidden="true"/><span>{label}</span></Link>)}
      </section>)}
    </nav>
    <Link className="back-home" href="/"><Home aria-hidden="true"/><span>返回公开网站</span></Link>
  </aside>;
}
