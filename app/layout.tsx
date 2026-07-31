import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, unreadNotificationCount } from "@/lib/data";
import { logoutAction } from "./actions";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const h=await headers(); const host=h.get("x-forwarded-host")??h.get("host")??"localhost:3000"; const protocol=h.get("x-forwarded-proto")??(host.startsWith("localhost")?"http":"https");
  return { metadataBase:new URL(`${protocol}://${host}`), title:{default:"主播的作品放映室",template:"%s · 主播的作品放映室"}, description:"向主播推荐书籍、漫画、电影、番剧和游戏，一起记录每次快乐相遇。", openGraph:{title:"主播的作品放映室",description:"把你喜欢的作品，轻轻放进我的收件箱",images:[{url:"/og.png",width:1200,height:630,alt:"主播的作品放映室"}]}, twitter:{card:"summary_large_image",images:["/og.png"]} };
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
            <Link href="/" className="brand"><span className="brand-mark">✦</span><span>{settings.siteName}</span></Link>
            <div className="nav-links">
              <Link href="/">时间流</Link>
              {user ? <Link href="/submit">去投稿</Link> : null}
              {user ? <Link href="/me/submissions">我的投稿</Link> : null}
              {user ? <Link href="/me/notifications" className="notification-link">消息{unread > 0 ? <span className="badge">{unread > 99 ? "99+" : unread}</span> : null}</Link> : null}
              {user?.role === "host" ? <Link href="/host">主播工作台</Link> : null}
              {user ? <form action={logoutAction}><button className="link-button" type="submit">退出</button></form> : <><Link href="/login">登录</Link><Link href="/register" className="nav-cta">注册</Link></>}
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer"><span>一起发现好作品</span><span aria-hidden="true">☁︎ · ✦ · ◡̈</span><span>个人非商业粉丝站</span></footer>
      </body>
    </html>
  );
}
