import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Bell, BookOpen, ClipboardList, Film, Gamepad2, House, Images, LayoutDashboard, LogIn, LogOut, Send, Tv, UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, unreadNotificationCount } from "@/lib/data";
import { logoutAction } from "./actions";
import { categoryLabels, primaryCategories } from "@/lib/config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const h=await headers(); const host=h.get("x-forwarded-host")??h.get("host")??"localhost:3000"; const protocol=h.get("x-forwarded-proto")??(host.startsWith("localhost")?"http":"https");
  return { metadataBase:new URL(`${protocol}://${host}`), title:{default:"神绮爱的作品放映室",template:"%s · 神绮爱的作品放映室"}, description:"向神绮爱推荐书籍、漫画、电影、动漫和游戏。", openGraph:{title:"神绮爱的作品放映室",description:"把喜欢的作品推荐给神绮爱",images:[{url:"/og.png",width:1200,height:630,alt:"神绮爱的作品放映室"}]}, twitter:{card:"summary_large_image",images:["/og.png"]} };
}

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  let unread = 0;
  if (user) try { unread = await unreadNotificationCount(user.id); } catch { unread = 0; }
  const style = {
    "--color-primary": settings.primaryColor, "--color-secondary": settings.secondaryColor,
    "--color-accent": settings.accentColor, "--color-background": settings.backgroundColor,
    "--card-opacity": settings.cardOpacity, "--background-overlay": settings.backgroundOverlay,
    ...(settings.backgroundType === "custom" && settings.backgroundImageUrl ? { "--custom-background": `url(${settings.backgroundImageUrl})` } : {}),
  } as CSSProperties;
  return (
    <html lang="zh-CN" style={style}>
      <body className={settings.backgroundType === "custom" ? "has-custom-background" : `built-in-background ${settings.backgroundImageUrl?.startsWith("builtin:") ? settings.backgroundImageUrl.replace(":", "-") : "builtin-warm"}`}>
        <div className="background-overlay" aria-hidden="true" />
        <header className="site-header">
          <nav className="nav-shell" aria-label="主导航">
            <div className="nav-top"><Link href="/" className="brand"><span className="brand-mark">✦</span><span>{settings.siteName}</span></Link>
            <div className="nav-links account-links">
              {user ? <Link href="/submit" aria-label="去投稿"><Send className="nav-icon" aria-hidden="true"/><span className="nav-action-label">去投稿</span></Link> : null}
              {user ? <Link href="/me/submissions" aria-label="我的投稿"><ClipboardList className="nav-icon" aria-hidden="true"/><span className="nav-action-label">我的投稿</span></Link> : null}
              {user ? <Link href="/me/notifications" className="notification-link" aria-label={unread > 0 ? `消息，${unread} 条未读` : "消息"}><Bell className="nav-icon" aria-hidden="true"/><span className="nav-action-label">消息</span>{unread > 0 ? <span className="badge">{unread > 99 ? "99+" : unread}</span> : null}</Link> : null}
              {user?.role === "host" ? <Link href="/host" aria-label="神绮爱工作台"><LayoutDashboard className="nav-icon" aria-hidden="true"/><span className="nav-action-label">神绮爱工作台</span></Link> : null}
              {user ? <form action={logoutAction}><button className="link-button" type="submit" aria-label="退出"><LogOut className="nav-icon" aria-hidden="true"/><span className="nav-action-label">退出</span></button></form> : <><Link href="/login" aria-label="登录"><LogIn className="nav-icon" aria-hidden="true"/><span className="nav-action-label">登录</span></Link><Link href="/register" className="nav-cta" aria-label="注册"><UserPlus className="nav-icon" aria-hidden="true"/><span className="nav-action-label">注册</span></Link></>}
            </div></div>
            <div className="category-nav" aria-label="作品分类"><Link href="/"><House className="category-icon" aria-hidden="true"/><span>首页</span></Link>{primaryCategories.map((category) => { const Icon = category === "book" ? BookOpen : category === "manga" ? Images : category === "movie" ? Film : category === "anime" ? Tv : Gamepad2; return <Link href={`/?category=${category}`} key={category}><Icon className="category-icon" aria-hidden="true"/><span>{categoryLabels[category]}</span></Link>; })}</div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer"><span>一起发现好作品</span><span aria-hidden="true">☁︎ · ✦ · ◡̈</span><span>个人非商业粉丝站</span></footer>
      </body>
    </html>
  );
}
