"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Check, Cloud, Image as ImageIcon, SlidersHorizontal } from "lucide-react";
import { themeAction } from "@/app/actions";
import type { SiteSetting } from "@/db/schema";
import { presetIdFromBackground, themePresetIds, themePresets, type ThemePresetId } from "@/lib/themes";

type ThemeState = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  opacity: number;
  overlay: number;
};

const rootProperties = ["--color-primary", "--color-secondary", "--color-accent", "--color-background", "--card-opacity", "--background-overlay", "--custom-background"] as const;

export function ThemeEditor({ settings }: { settings: SiteSetting }) {
  const [colors, setColors] = useState<ThemeState>({
    primary: settings.primaryColor,
    secondary: settings.secondaryColor,
    accent: settings.accentColor,
    background: settings.backgroundColor,
    opacity: Number(settings.cardOpacity),
    overlay: Number(settings.backgroundOverlay),
  });
  const savedPreset = presetIdFromBackground(settings.backgroundImageUrl);
  const [background, setBackground] = useState(settings.backgroundType === "custom" && settings.backgroundImageUrl ? settings.backgroundImageUrl : savedPreset ? themePresets[savedPreset].backgroundImageUrl : "builtin:warm");
  const initialPage = useRef<{ bodyClass: string; root: Record<string, string> } | null>(null);
  const presetId = presetIdFromBackground(background);
  const set = (key: keyof ThemeState, value: string | number) => setColors((old) => ({ ...old, [key]: value }));

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
    root.style.setProperty("--card-opacity", String(colors.opacity));
    root.style.setProperty("--background-overlay", String(colors.overlay));
    document.body.classList.remove("has-custom-background", "built-in-background", "builtin-stars", "builtin-bubbles", ...themePresetIds.map((id) => `builtin-${id}`));
    if (presetId) {
      document.body.classList.add("built-in-background", `builtin-${presetId}`);
      root.style.removeProperty("--custom-background");
    } else {
      document.body.classList.add("has-custom-background");
      root.style.setProperty("--custom-background", `url("${background.replaceAll('"', "")}")`);
    }
  }, [background, colors, presetId]);

  function choosePreset(id: ThemePresetId) {
    const preset = themePresets[id];
    setBackground(preset.backgroundImageUrl);
    setColors({ primary: preset.primaryColor, secondary: preset.secondaryColor, accent: preset.accentColor, background: preset.backgroundColor, opacity: preset.cardOpacity, overlay: preset.backgroundOverlay });
  }

  const previewStyle = {
    backgroundColor: colors.background,
    ...(presetId ? {} : { backgroundImage: `url("${background.replaceAll('"', "")}")` }),
    "--preview-primary": colors.primary,
    "--preview-secondary": colors.secondary,
    "--preview-accent": colors.accent,
    "--preview-opacity": colors.opacity,
  } as CSSProperties;

  return <form className="theme-layout" action={themeAction}>
    <section className="panel stack theme-controls">
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
      <details className="theme-tuning"><summary><SlidersHorizontal aria-hidden="true"/>微调当前主题</summary><div className="stack">
        <div className="color-grid"><Color name="primaryColor" label="主色" value={colors.primary} onChange={(v) => set("primary", v)}/><Color name="secondaryColor" label="辅助色" value={colors.secondary} onChange={(v) => set("secondary", v)}/><Color name="accentColor" label="强调色" value={colors.accent} onChange={(v) => set("accent", v)}/><Color name="backgroundColor" label="页面背景" value={colors.background} onChange={(v) => set("background", v)}/></div>
        <label>卡片透明度 <b>{colors.opacity.toFixed(2)}</b><input name="cardOpacity" type="range" min="0.7" max="1" step="0.01" value={colors.opacity} onChange={(event) => set("opacity", Number(event.target.value))}/></label>
        <label>背景遮罩 <b>{colors.overlay.toFixed(2)}</b><input name="backgroundOverlay" type="range" min="0" max="0.85" step="0.01" value={colors.overlay} onChange={(event) => set("overlay", Number(event.target.value))}/></label>
      </div></details>
      <button className="button primary" type="submit">保存网页主题</button>
    </section>
    <section className="theme-preview-wrap"><span className="eyebrow">实时预览</span><div className={`theme-preview ${presetId ? `builtin-${presetId}` : "theme-preview-custom"}`} style={previewStyle}><Cloud className="preview-cloud" aria-hidden="true"/><article><span>推荐单</span><h3>一部让人想聊很久的作品</h3><p>背景、配色、卡片和按钮会一起变化。</p><button type="button">查看详情</button></article></div></section>
  </form>;
}

function Color({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  return <label>{label}<span className="color-input"><input aria-label={label} name={name} type="color" value={value} onChange={(event) => onChange(event.target.value)}/><code>{value}</code></span></label>;
}
