"use client";

import { useEffect, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { Crop, ImagePlus, Monitor, Move, RotateCcw, RotateCw, Smartphone, Upload } from "lucide-react";
import { uploadBackgroundAction } from "@/app/actions";

type Target = "desktop" | "mobile";
type CropState = { zoom: number; rotation: number; x: number; y: number };
const initialCrop: CropState = { zoom: 1, rotation: 0, x: 0, y: 0 };
const frames = {
  desktop: { width: 640, height: 360, outputWidth: 1920, outputHeight: 1080, label: "电脑背景 · 16:9" },
  mobile: { width: 360, height: 640, outputWidth: 1080, outputHeight: 1920, label: "手机背景 · 9:16" },
} as const;

function rotatedSize(image: HTMLImageElement, rotation: number) {
  const quarterTurn = Math.abs(rotation / 90) % 2 === 1;
  return { width: quarterTurn ? image.naturalHeight : image.naturalWidth, height: quarterTurn ? image.naturalWidth : image.naturalHeight };
}

function clampCrop(image: HTMLImageElement, target: Target, state: CropState) {
  const frame = frames[target];
  const rotated = rotatedSize(image, state.rotation);
  const scale = Math.max(frame.width / rotated.width, frame.height / rotated.height) * state.zoom;
  const maxX = Math.max(0, (rotated.width * scale - frame.width) / 2) / frame.width;
  const maxY = Math.max(0, (rotated.height * scale - frame.height) / 2) / frame.height;
  return { ...state, x: Math.max(-maxX, Math.min(maxX, state.x)), y: Math.max(-maxY, Math.min(maxY, state.y)) };
}

function drawCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, target: Target, state: CropState, output = false) {
  const frame = frames[target];
  const width = output ? frame.outputWidth : frame.width;
  const height = output ? frame.outputHeight : frame.height;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("当前浏览器无法处理图片");
  context.fillStyle = "#fff9f2";
  context.fillRect(0, 0, width, height);
  const rotated = rotatedSize(image, state.rotation);
  const scale = Math.max(width / rotated.width, height / rotated.height) * state.zoom;
  context.save();
  context.translate(width / 2 + state.x * width, height / 2 + state.y * height);
  context.rotate(state.rotation * Math.PI / 180);
  context.scale(scale, scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  context.restore();
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("图片导出失败")), "image/webp", 0.84));
}

export function BackgroundCropper({ configured }: { configured: boolean }) {
  const [target, setTarget] = useState<Target>("desktop");
  const [crops, setCrops] = useState<Record<Target, CropState>>({ desktop: initialCrop, mobile: initialCrop });
  const [sourceName, setSourceName] = useState("");
  const [ready, setReady] = useState(0);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => () => { if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current); }, []);
  useEffect(() => {
    if (canvasRef.current && imageRef.current) drawCrop(canvasRef.current, imageRef.current, target, crops[target]);
  }, [crops, ready, target]);

  function updateCrop(change: Partial<CropState>) {
    setCrops((current) => {
      const next = { ...current[target], ...change };
      return { ...current, [target]: imageRef.current ? clampCrop(imageRef.current, target, next) : next };
    });
  }

  function chooseFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!(["image/png", "image/jpeg", "image/webp"] as string[]).includes(file.type)) return setError("请选择 PNG、JPEG 或 WebP 图片");
    if (file.size > 20 * 1024 * 1024) return setError("原图不能超过 20 MB");
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    imageRef.current = null;
    setSourceName("");
    setReady(0);
    const url = URL.createObjectURL(file);
    sourceUrlRef.current = url;
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth * image.naturalHeight > 50_000_000) { URL.revokeObjectURL(url); sourceUrlRef.current = null; setError("图片像素过大，请先缩小到 5000 万像素以内"); return; }
      imageRef.current = image;
      setCrops({ desktop: { ...initialCrop }, mobile: { ...initialCrop } });
      setSourceName(file.name);
      setReady((value) => value + 1);
    };
    image.onerror = () => setError("无法读取这张图片");
    image.src = url;
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY };
  }
  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = (event.clientX - dragRef.current.x) / rect.width;
    const deltaY = (event.clientY - dragRef.current.y) / rect.height;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setCrops((current) => {
      const next = { ...current[target], x: current[target].x + deltaX, y: current[target].y + deltaY };
      return { ...current, [target]: imageRef.current ? clampCrop(imageRef.current, target, next) : next };
    });
  }
  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  async function exportAndUpload() {
    if (!configured) return setError("请先配置真实的 Vercel Blob 令牌");
    const image = imageRef.current;
    if (!image) return setError("请先选择一张原图");
    setError("");
    try {
      const desktopCanvas = document.createElement("canvas");
      const mobileCanvas = document.createElement("canvas");
      drawCrop(desktopCanvas, image, "desktop", crops.desktop, true);
      drawCrop(mobileCanvas, image, "mobile", crops.mobile, true);
      const [desktopBlob, mobileBlob] = await Promise.all([canvasBlob(desktopCanvas), canvasBlob(mobileCanvas)]);
      if (desktopBlob.size > 2 * 1024 * 1024 || mobileBlob.size > 2 * 1024 * 1024 || desktopBlob.size + mobileBlob.size > 4 * 1024 * 1024) throw new Error("导出图片仍然过大，请换用尺寸更小的原图");
      const form = new FormData();
      form.set("backgroundDesktop", new File([desktopBlob], "background-desktop.webp", { type: desktopBlob.type || "image/webp" }));
      form.set("backgroundMobile", new File([mobileBlob], "background-mobile.webp", { type: mobileBlob.type || "image/webp" }));
      startTransition(async () => { await uploadBackgroundAction(form); });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "图片处理失败"); }
  }

  const crop = crops[target];
  return <section className="panel background-cropper">
    <div className="background-cropper-heading"><div><span className="eyebrow">自定义背景</span><h2>上传并裁切背景</h2><p className="helper">选择一张原图，分别调整电脑与手机画面。</p></div><label className="button secondary background-file-button"><ImagePlus aria-hidden="true"/>{sourceName ? "更换原图" : "选择原图"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])}/></label></div>
    {ready > 0 ? <>
      <div className="crop-target-tabs" role="tablist" aria-label="选择裁切尺寸"><button className={target === "desktop" ? "is-active" : ""} type="button" role="tab" aria-selected={target === "desktop"} onClick={() => setTarget("desktop")}><Monitor aria-hidden="true"/>电脑 16:9</button><button className={target === "mobile" ? "is-active" : ""} type="button" role="tab" aria-selected={target === "mobile"} onClick={() => setTarget("mobile")}><Smartphone aria-hidden="true"/>手机 9:16</button></div>
      <div className={`crop-stage crop-stage-${target}`}><canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}/><span><Move aria-hidden="true"/>拖动图片调整位置</span><b>{frames[target].label}</b></div>
      <div className="crop-controls">
        <label><span>缩放 <b>{crop.zoom.toFixed(2)}×</b></span><input type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={(event) => updateCrop({ zoom: Number(event.target.value) })}/></label>
        <div><button className="button small ghost" type="button" onClick={() => updateCrop({ rotation: crop.rotation - 90, x: 0, y: 0 })}><RotateCcw aria-hidden="true"/>向左旋转</button><button className="button small ghost" type="button" onClick={() => updateCrop({ rotation: crop.rotation + 90, x: 0, y: 0 })}><RotateCw aria-hidden="true"/>向右旋转</button><button className="button small ghost" type="button" onClick={() => updateCrop({ ...initialCrop })}>重置当前</button></div>
      </div>
      <div className="crop-output-summary"><Crop aria-hidden="true"/><span>将生成 <b>1920×1080</b> 电脑背景和 <b>1080×1920</b> 手机背景，浏览器会先压缩为 WebP。</span></div>
      <button className="button primary crop-upload-button" type="button" disabled={pending || !configured} onClick={exportAndUpload}><Upload aria-hidden="true"/>{pending ? "正在上传…" : configured ? "生成并上传两张背景" : "配置 Blob 后可上传"}</button>
    </> : <div className="crop-empty"><ImagePlus aria-hidden="true"/><h3>选择一张图片开始</h3><p>支持 PNG、JPEG、WebP，原图最大 20 MB。</p></div>}
    {error ? <p className="crop-error" role="alert">{error}</p> : null}
  </section>;
}
