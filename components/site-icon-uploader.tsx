"use client";

import { useState, useTransition } from "react";
import { ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { removeSiteIconAction, uploadSiteIconAction } from "@/app/actions";

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("无法读取这张图片")); };
    image.src = url;
  });
}

function pngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("图标导出失败")), "image/png"));
}

export function SiteIconUploader({ configured, currentUrl }: { configured: boolean; currentUrl: string | null }) {
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function chooseFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!configured) return setError("请先配置 Vercel Blob");
    if (!(["image/png", "image/jpeg", "image/webp"] as string[]).includes(file.type)) return setError("请选择 PNG、JPEG 或 WebP 图片");
    if (file.size > 10 * 1024 * 1024) return setError("原图不能超过 10 MB");
    try {
      const image = await loadImage(file);
      if (image.naturalWidth * image.naturalHeight > 25_000_000) throw new Error("图片像素过大，请先缩小到 2500 万像素以内");
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前浏览器无法处理图片");
      context.clearRect(0, 0, 512, 512);
      const scale = Math.min(512 / image.naturalWidth, 512 / image.naturalHeight);
      const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
      context.drawImage(image, (512 - width) / 2, (512 - height) / 2, width, height);
      const blob = await pngBlob(canvas);
      if (blob.size > 2 * 1024 * 1024) throw new Error("处理后的图标超过 2 MB，请换一张图片");
      setPreview(canvas.toDataURL("image/png"));
      const form = new FormData();
      form.set("siteIcon", new File([blob], "site-icon.png", { type: "image/png" }));
      startTransition(async () => { await uploadSiteIconAction(form); });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "图片处理失败"); }
  }

  function remove() {
    setError("");
    startTransition(async () => { await removeSiteIconAction(); });
  }

  return <section className="panel site-icon-editor">
    <div className="site-icon-heading">
      <span className="site-icon-preview" style={preview ? { backgroundImage: `url("${preview}")` } : undefined}>{preview ? null : <Sparkles aria-hidden="true"/>}</span>
      <div className="site-icon-copy"><span className="eyebrow">网站标识</span><h2>网页图标</h2><p className="helper">同时显示在网站标题旁和浏览器标签页。图片会完整缩放到 512×512。</p></div>
    </div>
    <div className="site-icon-actions">
      <label className={`button primary site-icon-file-button${pending ? " disabled" : ""}`}><ImagePlus aria-hidden="true"/>{pending ? "正在上传…" : preview ? "更换图标" : "上传图标"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={pending || !configured} onChange={(event) => chooseFile(event.target.files?.[0])}/></label>
      {currentUrl ? <button className="button danger" type="button" disabled={pending} onClick={remove}><Trash2 aria-hidden="true"/>移除</button> : null}
    </div>
    {error ? <p className="site-icon-error" role="alert">{error}</p> : null}
  </section>;
}
