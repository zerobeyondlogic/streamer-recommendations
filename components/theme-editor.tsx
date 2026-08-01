"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Check, Cloud, Image as ImageIcon, SlidersHorizontal } from "lucide-react";
import { appearanceAction, themeAction } from "@/app/actions";
import type { SiteSetting } from "@/db/schema";
import { presetIdFromBackground, themePresetIds, themePresets, type ThemePresetId } from "@/lib/themes";

type ThemeState = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  overlay: number;
};

type AppearanceState = {
  navOpacity: number;
  heroOpacity: number;
  filterOpacity: number;
  cardOpacity: number;
  ambientTextMist: number;
  navBlur: boolean;
  heroBlur: boolean;
  filterBlur: boolean;
  cardBlur: boolean;
};

const rootProperties = ["--color-primary", "--color-secondary", "--color-accent", "--color-background", "--nav-opacity", "--hero-opacity", "--filter-opacity", "--card-opacity", "--nav-backdrop-filter", "--hero-backdrop-filter", "--filter-backdrop-filter", "--card-backdrop-filter", "--ambient-text-mist", "--background-overlay", "--custom-background"] as const;

export function ThemeEditor({ settings }: { settings: SiteSetting }) {
  const [colors, setColors] = useState<ThemeState>({
    primary: settings.primaryColor,
    secondary: settings.secondaryColor,
    accent: settings.accentColor,
    background: settings.backgroundColor,
    overlay: Number(settings.backgroundOverlay),
  });
  const [appearance, setAppearance] = useState<AppearanceState>({
    navOpacity: Number(settings.navOpacity),
    heroOpacity: Number(settings.heroOpacity),
    filterOpacity: Number(settings.filterOpacity),
    cardOpacity: Number(settings.cardOpacity),
    ambientTextMist: Number(settings.ambientTextMist),
    navBlur: settings.navBlur,
    heroBlur: settings.heroBlur,
    filterBlur: settings.filterBlur,
    cardBlur: settings.cardBlur,
  });
  const savedPreset = presetIdFromBackground(settings.backgroundImageUrl);
  const [background, setBackground] = useState(settings.backgroundType === "custom" && settings.backgroundImageUrl ? settings.backgroundImageUrl : savedPreset ? themePresets[savedPreset].backgroundImageUrl : "builtin:warm");
  const initialPage = useRef<{ bodyClass: string; root: Record<string, string> } | null>(null);
  const presetId = presetIdFromBackground(background);
  const set = (key: keyof ThemeState, value: string | number) => setColors((old) => ({ ...old, [key]: value }));
  const setLayer = <K extends keyof AppearanceState>(key: K, value: AppearanceState[K]) => setAppearance((old) => ({ ...old, [key]: value }));

  useEffect(() => {
    const root = document.documentElement;
    initialPage.current = { bodyClass: document.body.className, root: Object.fromEntries(rootProperties.map((name) => [name, root.style.getPropertyValue(name)])) };
    return () => {
      if (!initialPage.current) return;
      document.body.className = initialPage.current.bodyClass;
      for (const name of rootProperties) {
        const value = initialPage.current.root[name];
        if (value) root.style.setProperty(name, value); else root.style.removeProperty(name);
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", colors.primary);
    root.style.setProperty("--color-secondary", colors.secondary);
    root.style.setProperty("--color-accent", colors.accent);
    root.style.setProperty("--color-background", colors.background);
    root.style.setProperty("--nav-opacity", String(appearance.navOpacity));
    root.style.setProperty("--hero-opacity", String(appearance.heroOpacity));
    root.style.setProperty("--filter-opacity", String(appearance.filterOpacity));
    root.style.setProperty("--card-opacity", String(appearance.cardOpacity));
    root.style.setProperty("--nav-backdrop-filter", appearance.navBlur ? "blur(18px) saturate(120%)" : "none");
    root.style.setProperty("--hero-backdrop-filter", appearance.heroBlur ? "blur(14px) saturate(115%)" : "none");
    root.style.setProperty("--filter-backdrop-filter", appearance.filterBlur ? "blur(14px) saturate(112%)" : "none");
    root.style.setProperty("--card-backdrop-filter", appearance.cardBlur ? "blur(12px) saturate(110%)" : "none");
    root.style.setProperty("--ambient-text-mist", String(appearance.ambientTextMist));
    root.style.setProperty("--background-overlay", String(colors.overlay));
    document.body.classList.remove("has-custom-background", "built-in-background", "builtin-stars", "builtin-bubbles", ...themePresetIds.map((id) => `builtin-${id}`));
    if (presetId) {
      document.body.classList.add("built-in-background", `builtin-${presetId}`);
      root.style.removeProperty("--custom-background");
    } else {
      document.body.classList.add("has-custom-background");
      root.style.setProperty("--custom-background", `url("${background.replaceAll('"', "")}")`);
    }
  }, [appearance, background, colors, presetId]);

  function choosePreset(id: ThemePresetId) {
    const preset = themePresets[id];
    setBackground(preset.backgroundImageUrl);
    setColors({ primary: preset.primaryColor, secondary: preset.secondaryColor, accent: preset.accentColor, background: preset.backgroundColor, overlay: preset.backgroundOverlay });
  }

  const previewStyle = {
    backgroundColor: colors.background,
    ...(presetId ? {} : { backgroundImage: `url("${background.replaceAll('"', "")}")` }),
    "--preview-primary": colors.primary,
    "--preview-secondary": colors.secondary,
    "--preview-accent": colors.accent,
    "--preview-nav-opacity": appearance.navOpacity,
    "--preview-hero-opacity": appearance.heroOpacity,
    "--preview-filter-opacity": appearance.filterOpacity,
    "--preview-card-opacity": appearance.cardOpacity,
    "--preview-ambient-text-mist": appearance.ambientTextMist,
    "--preview-nav-backdrop": appearance.navBlur ? "blur(18px) saturate(120%)" : "none",
    "--preview-hero-backdrop": appearance.heroBlur ? "blur(14px) saturate(115%)" : "none",
    "--preview-filter-backdrop": appearance.filterBlur ? "blur(14px) saturate(112%)" : "none",
    "--preview-card-backdrop": appearance.cardBlur ? "blur(12px) saturate(110%)" : "none",
  } as CSSProperties;

  return <div className="theme-layout">
    <div className="theme-control-column">
    <form className="panel stack theme-controls" action={themeAction}>
      <div><span className="eyebrow">网页主题</span><h2>选择整体风格</h2><p className="helper">切换后立即预览；点击保存才会应用给所有访客。</p></div>
      <div className="theme-preset-grid" role="radiogroup" aria-label="网页主题">
        {themePresetIds.map((id) => {
          const preset = themePresets[id];
          return <button className={`theme-preset-card theme-preset-${id} ${presetId === id ? "is-selected" : ""}`} type="button" role="radio" aria-checked={presetId === id} onClick={() => choosePreset(id)} key={id}>
            <span className="theme-preset-art" aria-hidden="true"><i/><i/><i/></span>
            <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
            {presetId === id ? <Check aria-hidden="true"/> : null}
          </button>;
        })}
        {settings.backgroundType === "custom" && settings.backgroundImageUrl ? <button className={`theme-preset-card theme-preset-custom ${!presetId ? "is-selected" : ""}`} type="button" role="radio" aria-checked={!presetId} onClick={() => setBackground(settings.backgroundImageUrl!)}><span className="theme-preset-art" aria-hidden="true"><ImageIcon/></span><span><strong>自定义背景</strong><small>沿用已上传的背景图片</small></span>{!presetId ? <Check aria-hidden="true"/> : null}</button> : null}
      </div>
      <input type="hidden" name="backgroundType" value={presetId ? "built_in" : "custom"}/>
      <input type="hidden" name="backgroundImageUrl" value={background}/>
      <details className="theme-tuning"><summary><SlidersHorizontal aria-hidden="true"/>微调当前配色</summary><div className="stack">
        <div className="color-grid"><Color name="primaryColor" label="主色" value={colors.primary} onChange={(v) => set("primary", v)}/><Color name="secondaryColor" label="辅助色" value={colors.secondary} onChange={(v) => set("secondary", v)}/><Color name="accentColor" label="强调色" value={colors.accent} onChange={(v) => set("accent", v)}/><Color name="backgroundColor" label="页面背景" value={colors.background} onChange={(v) => set("background", v)}/></div>
        <label>背景遮罩 <b>{colors.overlay.toFixed(2)}</b><input name="backgroundOverlay" type="range" min="0" max="0.85" step="0.01" value={colors.overlay} onChange={(event) => set("overlay", Number(event.target.value))}/><span className="helper">覆盖在背景图片上的底色；越高，背景越淡。</span></label>
      </div></details>
      <button className="button primary" type="submit">保存网页主题</button>
    </form>
    <form className="panel stack appearance-controls" action={appearanceAction}>
      <div><span className="eyebrow">层级外观</span><h2>透明度与毛玻璃</h2><p className="helper">独立于网页主题；调整后立即预览，保存后应用给访客。</p></div>
      <div className="appearance-control-grid">
        <LayerControl label="顶部菜单栏" opacityName="navOpacity" blurName="navBlur" opacity={appearance.navOpacity} blur={appearance.navBlur} onOpacity={(value) => setLayer("navOpacity", value)} onBlur={(value) => setLayer("navBlur", value)}/>
        <LayerControl label="页面大卡片" opacityName="heroOpacity" blurName="heroBlur" opacity={appearance.heroOpacity} blur={appearance.heroBlur} onOpacity={(value) => setLayer("heroOpacity", value)} onBlur={(value) => setLayer("heroBlur", value)}/>
        <LayerControl label="搜索与筛选栏" opacityName="filterOpacity" blurName="filterBlur" opacity={appearance.filterOpacity} blur={appearance.filterBlur} onOpacity={(value) => setLayer("filterOpacity", value)} onBlur={(value) => setLayer("filterBlur", value)}/>
        <LayerControl label="普通内容卡片" opacityName="cardOpacity" blurName="cardBlur" opacity={appearance.cardOpacity} blur={appearance.cardBlur} onOpacity={(value) => setLayer("cardOpacity", value)} onBlur={(value) => setLayer("cardBlur", value)}/>
      </div>
      <div className="appearance-control ambient-mist-control"><label><span>背景悬浮文字雾气<b>{appearance.ambientTextMist.toFixed(2)}</b></span><input name="ambientTextMist" type="range" min="0" max="1" step="0.01" value={appearance.ambientTextMist} onChange={(event) => setLayer("ambientTextMist", Number(event.target.value))}/></label><span className="helper">只影响直接浮在背景图上的文字；不影响菜单、卡片及卡片内文字。</span></div>
      <button className="button primary" type="submit">保存层级外观</button>
    </form>
    </div>
    <section className="theme-preview-wrap"><span className="eyebrow">实时预览</span><div className={`theme-preview ${presetId ? `builtin-${presetId}` : "theme-preview-custom"}`} style={previewStyle}><Cloud className="preview-cloud" aria-hidden="true"/><div className="theme-preview-nav">网站标题 <span>推荐单　许愿箱　美食家</span></div><div className="theme-preview-hero"><span>页面大卡片</span><h3>把喜欢的作品分享出来</h3><p>顶部主视觉使用独立外观。</p></div><div className="theme-preview-ambient"><span>背景悬浮文字</span><strong>最近的作品推荐</strong></div><div className="theme-preview-filter"><span>搜索作品……</span><span>全部　⌄</span><b>筛选</b></div><article><span>普通内容卡片</span><h3>一部让人想聊很久的作品</h3><p>列表、详情和表单使用普通卡片外观。</p><button type="button">查看详情</button></article></div></section>
  </div>;
}

function Color({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  return <label>{label}<span className="color-input"><input aria-label={label} name={name} type="color" value={value} onChange={(event) => onChange(event.target.value)}/><code>{value}</code></span></label>;
}

function LayerControl({ label, opacityName, blurName, opacity, blur, onOpacity, onBlur }: { label:string; opacityName:string; blurName:string; opacity:number; blur:boolean; onOpacity:(value:number)=>void; onBlur:(value:boolean)=>void }) {
  return <div className="appearance-control"><label><span>{label}<b>{opacity.toFixed(2)}</b></span><input name={opacityName} type="range" min="0.3" max="1" step="0.01" value={opacity} onChange={(event) => onOpacity(Number(event.target.value))}/></label><label className="appearance-blur-toggle"><input name={blurName} type="checkbox" checked={blur} onChange={(event) => onBlur(event.target.checked)}/><span>启用毛玻璃</span></label></div>;
}
