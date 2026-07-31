import Link from "next/link";
import { requireHost } from "@/lib/auth";
export default async function HostLayout({ children }: { children: React.ReactNode }) {
  await requireHost();
  return <div className="host-shell"><aside className="host-sidebar"><div><span className="eyebrow">Host studio</span><strong>主播工作台</strong></div><nav><Link href="/host">总览</Link><Link href="/host/recommend">撰写原创推荐</Link><Link href="/host/inbox">投稿收件箱</Link><Link href="/host/library">公开推荐库</Link><Link href="/host/users">UID 核验</Link><Link href="/host/theme">主题设置</Link><Link href="/host/backup">数据备份</Link></nav><Link className="back-home" href="/">← 返回公开首页</Link></aside><div className="host-content">{children}</div></div>;
}
