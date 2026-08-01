"use client";

import { useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { removeRecommendationHeroImageAction, uploadRecommendationHeroImageAction } from "@/app/actions";

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("无法读取这张图片")); };
    image.src = url;
  });
}

function webpBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("主视觉图片导出失败")), "image/webp", 0.88));
}

export function RecommendationHeroUploader({ configured, currentUrl }: { configured: boolean; currentUrl: string | null }) {
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function chooseFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!configured) return setError("请先配置 Vercel Blob");
    if (!(new Set(["image/png", "image/jpeg", "image/webp"])).has(file.type)) return setError("请选择 PNG、JPEG 或 WebP 图片");
    if (file.size > 20 * 1024 * 1024) return setError("原图不能超过 20 MB");
    try {
      const image = await loadImage(file);
      if (image.naturalWidth * image.naturalHeight > 50_000_000) throw new Error("图片像素过大，请先缩小到 5000 万像素以内");
      const scale = Math.min(1, 1600 / image.naturalWidth, 1200 / image.naturalHeight);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("当前浏览器无法处理图片");
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);
      const blob = await webpBlob(canvas);
      if (blob.size > 3 * 1024 * 1024) throw new Error("处理后的图片超过 3 MB，请换一张更简单的图片");
      setPreview(canvas.toDataURL("image/webp", 0.88));
      const form = new FormData();
      form.set("recommendationHeroImage", new File([blob], "recommendation-hero.webp", { type: "image/webp" }));
      startTransition(async () => { await uploadRecommendationHeroImageAction(form); });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "图片处理失败"); }
  }

  function remove() {
    setError("");
    startTransition(async () => { await removeRecommendationHeroImageAction(); });
  }

  return <section className="panel recommendation-hero-editor">
    <div className="recommendation-hero-editor-copy"><span className="eyebrow">推荐单主视觉</span><h2>首页插画</h2><p className="helper">完整缩放到右侧圆角区域，不裁切、不加图片边线；透明区域会透出胶囊底色。</p></div>
    <div className={`recommendation-hero-preview${preview ? " has-image" : ""}`} style={preview ? { backgroundImage: `url("${preview}")` } : undefined} aria-label={preview ? "当前首页插画预览" : "尚未上传首页插画"}>{preview ? null : <span>未上传时保持空白</span>}</div>
    <div className="recommendation-hero-actions">
      <label className={`button primary recommendation-hero-file-button${pending ? " disabled" : ""}`}><ImagePlus aria-hidden="true"/>{pending ? "正在上传…" : preview ? "更换图片" : "上传图片"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={pending || !configured} onChange={(event) => chooseFile(event.target.files?.[0])}/></label>
      {currentUrl ? <button className="button danger" type="button" disabled={pending} onClick={remove}><Trash2 aria-hidden="true"/>移除</button> : null}
    </div>
    {error ? <p className="site-icon-error" role="alert">{error}</p> : null}
  </section>;
}
