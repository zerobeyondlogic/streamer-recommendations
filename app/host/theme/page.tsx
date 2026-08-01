import type { Metadata } from "next";
import { removeBackgroundAction, resetThemeAction, siteCopyAction, uploadBackgroundAction } from "@/app/actions";
import { ThemeEditor } from "@/components/theme-editor";
import { Notice } from "@/components/notice";
import { getSettings, getSiteCopy } from "@/lib/data";

export const metadata:Metadata={title:"主题与文案"};

export default async function ThemePage({searchParams}:{searchParams:Promise<{error?:string;success?:string}>}) {
  const [settings, siteCopy, params] = await Promise.all([getSettings(), getSiteCopy(), searchParams]);
  return <><header className="host-heading"><div><span className="eyebrow">Theme studio</span><h1>主题与文案</h1><p>站名、浏览器标题和页面文案保存后同步生效。</p></div></header><Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    <ThemeEditor settings={settings}/>
    <form className="panel stack site-copy-editor" action={siteCopyAction}><div><span className="eyebrow">Page copy</span><h2>页面主要文字</h2><p className="helper">这里控制各栏目的大标题、副标题和列表标题。</p></div>
      <fieldset><legend>推荐单首页</legend><label>主标题（普通部分）<input name="recommendationHeroTitle" defaultValue={siteCopy.recommendationHeroTitle} maxLength={80} required/></label><label>主标题（强调色部分）<input name="recommendationHeroAccent" defaultValue={siteCopy.recommendationHeroAccent} maxLength={80} required/></label><label>列表标题<input name="recommendationSectionTitle" defaultValue={siteCopy.recommendationSectionTitle} maxLength={80} required/></label><span className="helper">推荐单副标题使用上方“网站副标题”。</span></fieldset>
      <fieldset><legend>美食家</legend><label>主标题<input name="foodHeroTitle" defaultValue={siteCopy.foodHeroTitle} maxLength={100} required/></label><label>副标题<textarea name="foodTagline" defaultValue={siteCopy.foodTagline} maxLength={180}/></label><label>列表标题<input name="foodSectionTitle" defaultValue={siteCopy.foodSectionTitle} maxLength={80} required/></label></fieldset>
      <fieldset><legend>许愿箱</legend><label>主标题<input name="wishHeroTitle" defaultValue={siteCopy.wishHeroTitle} maxLength={100} required/></label><label>副标题<textarea name="wishTagline" defaultValue={siteCopy.wishTagline} maxLength={180}/></label><label>列表标题<input name="wishSectionTitle" defaultValue={siteCopy.wishSectionTitle} maxLength={80} required/></label></fieldset>
      <fieldset><legend>棉花糖</legend><label>主标题<input name="marshmallowHeroTitle" defaultValue={siteCopy.marshmallowHeroTitle} maxLength={100} required/></label><label>副标题<textarea name="marshmallowTagline" defaultValue={siteCopy.marshmallowTagline} maxLength={180}/></label><label>公开墙标题<input name="marshmallowSectionTitle" defaultValue={siteCopy.marshmallowSectionTitle} maxLength={80} required/></label></fieldset>
      <button className="button primary" type="submit">保存页面文案</button>
    </form>
    <div className="host-edit-grid theme-extra"><section className="panel stack"><form className="stack" action={uploadBackgroundAction}><h2>自定义背景</h2><p className="helper">PNG、JPEG 或 WebP，最大 5 MB。</p>{process.env.BLOB_READ_WRITE_TOKEN?<><label>背景图片<input name="background" type="file" accept="image/png,image/jpeg,image/webp" required/></label><button className="button secondary">上传并启用</button></>:<Notice type="info">尚未配置 Vercel Blob。</Notice>}</form>{settings.backgroundType==="custom"?<form action={removeBackgroundAction}><button className="button danger" type="submit">移除背景</button></form>:null}</section><form className="panel stack" action={resetThemeAction}><h2>恢复默认</h2><p className="helper">恢复默认文字、配色和背景。</p><button className="button danger" type="submit">恢复默认</button></form></div>
  </>;
}
