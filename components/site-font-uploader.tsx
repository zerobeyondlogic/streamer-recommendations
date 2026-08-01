"use client";

import { useState, useTransition } from "react";
import { Trash2, Type } from "lucide-react";
import { removeSiteFontAction, uploadSiteFontAction } from "@/app/actions";

const MAX_SITE_FONT_SIZE = 4 * 1024 * 1024;

export function SiteFontUploader({ configured, currentUrl }: { configured: boolean; currentUrl: string | null }) {
  const [enabled, setEnabled] = useState(Boolean(currentUrl));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function chooseFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!configured) return setError("请先配置 Vercel Blob");
    if (file.size > MAX_SITE_FONT_SIZE) return setError("字体文件不能超过 4 MB");
    const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (String.fromCharCode(...bytes) !== "wOF2") return setError("请选择有效的 WOFF2 字体文件");
    const form = new FormData();
    form.set("siteFont", new File([file], "site-font.woff2", { type: "font/woff2" }));
    setEnabled(true);
    startTransition(async () => { await uploadSiteFontAction(form); });
  }

  function remove() {
    setError("");
    setEnabled(false);
    startTransition(async () => { await removeSiteFontAction(); });
  }

  return <section className="panel site-icon-editor">
    <div className="site-icon-heading">
      <span className="site-icon-preview"><Type aria-hidden="true"/></span>
      <div className="site-icon-copy"><span className="eyebrow">全站字体</span><h2>{enabled ? "已启用自定义字体" : "系统字体"}</h2><p className="helper">仅支持 WOFF2，最大 4 MB。上传前请确认字体许可允许网页嵌入。</p></div>
    </div>
    <div className="site-icon-actions">
      <label className={`button primary site-icon-file-button${pending ? " disabled" : ""}`}><Type aria-hidden="true"/>{pending ? "正在上传…" : enabled ? "更换字体" : "上传字体"}<input type="file" accept=".woff2,font/woff2" disabled={pending || !configured} onChange={(event) => chooseFile(event.target.files?.[0])}/></label>
      {currentUrl ? <button className="button danger" type="button" disabled={pending} onClick={remove}><Trash2 aria-hidden="true"/>恢复系统字体</button> : null}
    </div>
    {error ? <p className="site-icon-error" role="alert">{error}</p> : null}
  </section>;
}
