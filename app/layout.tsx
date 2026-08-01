import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Cloud, LogIn, Sparkles, UserPlus } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { MainNavigation } from "@/components/main-navigation";
import { NotificationLink } from "@/components/notification-link";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, unreadNotificationCount } from "@/lib/data";
import { isAllowedBackgroundUrl, isAllowedSiteFontUrl, isAllowedSiteIconUrl } from "@/lib/security";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [h, settings] = await Promise.all([headers(), getSettings()]); const host=h.get("x-forwarded-host")??h.get("host")??"localhost:3000"; const protocol=h.get("x-forwarded-proto")??(host.startsWith("localhost")?"http":"https");
  const siteIcon = isAllowedSiteIconUrl(settings.siteIconUrl) ? settings.siteIconUrl : null;
  return { metadataBase:new URL(`${protocol}://${host}`), title:{default:settings.siteName,template:`%s · ${settings.siteName}`}, description:settings.siteTagline, icons:siteIcon?{icon:[{url:siteIcon,type:"image/png",sizes:"512x512"}],shortcut:[siteIcon],apple:[{url:siteIcon,type:"image/png",sizes:"512x512"}]}:undefined, formatDetection:{telephone:false,date:false,email:false,address:false}, openGraph:{title:settings.siteName,description:settings.siteTagline,images:[{url:"/og-v2.png",width:1200,height:630,alt:settings.siteName}]}, twitter:{card:"summary_large_image",images:["/og-v2.png"]} };
}

export const dynamic = "force-dynamic";

const colorModeBootScript = `(function(){try{var key='akofans-color-mode';var saved=localStorage.getItem(key);var mode=saved==='dark'||saved==='light'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.colorMode=mode;document.documentElement.style.colorScheme=mode;}catch(e){document.documentElement.dataset.colorMode='light';}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  let unread = 0;
  if (user) try { unread = await unreadNotificationCount(user.id); } catch { unread = 0; }
  const customBackgroundUrl = settings.backgroundType === "custom" && isAllowedBackgroundUrl(settings.backgroundImageUrl) ? settings.backgroundImageUrl : null;
  const customMobileBackgroundUrl = settings.backgroundType === "custom" && isAllowedBackgroundUrl(settings.backgroundImageMobileUrl) ? settings.backgroundImageMobileUrl : customBackgroundUrl;
  const siteIconUrl = isAllowedSiteIconUrl(settings.siteIconUrl) ? settings.siteIconUrl : null;
  const customFontUrl = isAllowedSiteFontUrl(settings.customFontUrl) ? new URL(settings.customFontUrl!).href : null;
  const style = {
    "--color-primary": settings.primaryColor, "--color-secondary": settings.secondaryColor,
    "--color-accent": settings.accentColor, "--color-background": settings.backgroundColor,
    "--nav-opacity": settings.navOpacity, "--hero-opacity": settings.heroOpacity,
    "--filter-opacity": settings.filterOpacity, "--card-opacity": settings.cardOpacity,
    "--nav-backdrop-filter": settings.navBlur ? "blur(18px) saturate(120%)" : "none",
    "--hero-backdrop-filter": settings.heroBlur ? "blur(14px) saturate(115%)" : "none",
    "--filter-backdrop-filter": settings.filterBlur ? "blur(14px) saturate(112%)" : "none",
    "--card-backdrop-filter": settings.cardBlur ? "blur(12px) saturate(110%)" : "none",
    "--ambient-text-mist": settings.ambientTextMist,
    "--background-overlay": settings.backgroundOverlay,
    ...(customFontUrl ? { "--site-font": '"AkoCustomFont",ui-rounded,"Hiragino Sans GB","Microsoft YaHei UI","PingFang SC",system-ui,sans-serif' } : {}),
    ...(customBackgroundUrl ? { "--custom-background": `url("${customBackgroundUrl}")`, "--custom-background-mobile": `url("${customMobileBackgroundUrl}")` } : {}),
  } as CSSProperties;
  const customFontCss = customFontUrl ? `@font-face{font-family:"AkoCustomFont";src:url("${customFontUrl}") format("woff2");font-display:swap;font-style:normal;font-weight:100 900;}` : "";
  return (
    <html lang="zh-CN" style={style} suppressHydrationWarning>
      <head>{customFontCss ? <style dangerouslySetInnerHTML={{ __html: customFontCss }}/> : null}<script dangerouslySetInnerHTML={{ __html: colorModeBootScript }}/></head>
      <body suppressHydrationWarning className={customBackgroundUrl ? "has-custom-background" : `built-in-background ${settings.backgroundImageUrl?.startsWith("builtin:") ? settings.backgroundImageUrl.replace(":", "-") : "builtin-warm"}`}>
        <div className="site-background" aria-hidden="true" />
        <div className="background-overlay" aria-hidden="true" />
        <header className="site-header">
          <nav className="nav-shell" aria-label="主导航">
            <div className="nav-top"><Link href="/" className="brand"><span className={`brand-mark${siteIconUrl ? " has-custom-icon" : ""}`} style={siteIconUrl ? { backgroundImage: `url("${siteIconUrl}")` } : undefined}>{siteIconUrl ? null : <Sparkles aria-hidden="true"/>}</span><span>{settings.siteName}</span></Link>
            <div className="nav-links account-links">
              <ThemeModeToggle/>
              {user ? <NotificationLink unread={unread}/> : null}
              {user ? <AccountMenu isHost={user.role === "host"}/> : <><Link href="/login" className="nav-login" aria-label="登录"><LogIn className="nav-icon" aria-hidden="true"/><span className="nav-action-label">登录</span></Link><Link href="/register" className="nav-cta" aria-label="注册"><UserPlus className="nav-icon" aria-hidden="true"/><span className="nav-action-label">注册</span></Link></>}
            </div></div>
            <MainNavigation/>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer"><span>一起发现喜欢的事</span><span className="footer-symbols" aria-hidden="true"><Cloud/><Sparkles/></span><span>个人非商业粉丝站</span></footer>
      </body>
    </html>
  );
}
