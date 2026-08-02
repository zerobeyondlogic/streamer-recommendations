import type { Metadata } from "next";
import { removeBackgroundAction, resetThemeAction, siteCopyAction } from "@/app/actions";
import { BackgroundCropper } from "@/components/background-cropper";
import { SiteIconUploader } from "@/components/site-icon-uploader";
import { SiteFontUploader } from "@/components/site-font-uploader";
import { ThemeEditor } from "@/components/theme-editor";
import { Notice } from "@/components/notice";
import { getSettings, getSiteCopy } from "@/lib/data";
import { isBlobStorageConfigured } from "@/lib/blob";

export const metadata:Metadata={title:"页面设置"};

export default async function ThemePage({searchParams}:{searchParams:Promise<{error?:string;success?:string}>}) {
  const [settings, siteCopy, params] = await Promise.all([getSettings(), getSiteCopy(), searchParams]);
  const blobConfigured = isBlobStorageConfigured();
  return <><header className="host-heading"><div><span className="eyebrow">页面设置</span><h1>主题与文字</h1><p>调整全站风格与各页面主要文字。</p></div></header><Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    <ThemeEditor settings={settings}/>
    <form className="panel stack site-copy-editor" action={siteCopyAction}><div><span className="eyebrow">页面文字</span><h2>页面主要文字</h2><p className="helper">网站名称、页面标题和副标题都在这里修改。</p></div>
      <fieldset><legend>网站信息</legend><label>网站名称<input name="siteName" defaultValue={settings.siteName} maxLength={50} required/></label><label>网站说明<textarea name="siteTagline" defaultValue={settings.siteTagline} maxLength={120}/></label></fieldset>
      <fieldset><legend>推荐单首页</legend><label>主标题（普通部分）<input name="recommendationHeroTitle" defaultValue={siteCopy.recommendationHeroTitle} maxLength={80} required/></label><label>主标题（强调色部分）<input name="recommendationHeroAccent" defaultValue={siteCopy.recommendationHeroAccent} maxLength={80} required/></label><label>副标题<textarea name="recommendationTagline" defaultValue={siteCopy.recommendationTagline} maxLength={180}/></label><label>列表标题<input name="recommendationSectionTitle" defaultValue={siteCopy.recommendationSectionTitle} maxLength={80} required/></label></fieldset>
      <fieldset><legend>美食家</legend><label>主标题<input name="foodHeroTitle" defaultValue={siteCopy.foodHeroTitle} maxLength={100} required/></label><label>副标题<textarea name="foodTagline" defaultValue={siteCopy.foodTagline} maxLength={180}/></label><label>列表标题<input name="foodSectionTitle" defaultValue={siteCopy.foodSectionTitle} maxLength={80} required/></label></fieldset>
      <fieldset><legend>许愿箱</legend><label>主标题<input name="wishHeroTitle" defaultValue={siteCopy.wishHeroTitle} maxLength={100} required/></label><label>副标题<textarea name="wishTagline" defaultValue={siteCopy.wishTagline} maxLength={180}/></label><label>列表标题<input name="wishSectionTitle" defaultValue={siteCopy.wishSectionTitle} maxLength={80} required/></label></fieldset>
      <fieldset><legend>棉花糖</legend><label>主标题<input name="marshmallowHeroTitle" defaultValue={siteCopy.marshmallowHeroTitle} maxLength={100} required/></label><label>副标题<textarea name="marshmallowTagline" defaultValue={siteCopy.marshmallowTagline} maxLength={180}/></label><label>公开墙标题<input name="marshmallowSectionTitle" defaultValue={siteCopy.marshmallowSectionTitle} maxLength={80} required/></label></fieldset>
      <button className="button primary" type="submit">保存页面文案</button>
    </form>
    {!blobConfigured ? <section className="panel blob-setup-guide"><Notice type="info">图片上传尚未启用：当前令牌仍是示例占位符。</Notice><h2>连接 Vercel Blob</h2><ol><li>打开 Vercel 项目 → Storage。</li><li>创建并连接一个 <b>Public Blob</b> store。</li><li>确认 Production 环境获得 <code>BLOB_READ_WRITE_TOKEN</code>，然后重新部署。</li><li>本地预览可运行 <code>vercel env pull .env.local</code>。</li></ol><p className="helper">不要把真实令牌提交到 GitHub。</p></section> : null}
    <SiteIconUploader configured={blobConfigured} currentUrl={settings.siteIconUrl}/>
    <SiteFontUploader configured={blobConfigured} currentUrl={settings.customFontUrl}/>
    <BackgroundCropper configured={blobConfigured}/>
    <div className="host-edit-grid theme-extra">{settings.backgroundType==="custom"?<form className="panel stack" action={removeBackgroundAction}><h2>移除自定义背景</h2><p className="helper">删除电脑和手机背景，恢复暖阳原点。</p><button className="button danger" type="submit">移除背景</button></form>:null}<form className="panel stack" action={resetThemeAction}><h2>恢复默认</h2><p className="helper">恢复默认主题和页面文字。</p><button className="button danger" type="submit">恢复默认</button></form></div>
  </>;
}
