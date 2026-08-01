"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, Cloud, Film, Gamepad2, Images, Shapes, Sparkles, Tv, Utensils } from "lucide-react";
import { categoryLabels, primaryCategories } from "@/lib/config";

export function MainNavigation() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return <div className="category-nav" aria-label="网站栏目">
    <div className={`recommendation-nav ${open ? "is-open" : ""}`} ref={wrapperRef}>
      <Link className="category-nav-main" href="/" onClick={() => setOpen(false)}><BookOpen className="category-icon" aria-hidden="true"/><span>推荐单</span></Link>
      <button type="button" aria-label="展开推荐单分类" aria-expanded={open} onClick={() => setOpen((value) => !value)}><ChevronDown aria-hidden="true"/></button>
      <div className="recommendation-submenu" aria-label="推荐单分类">
        <Link href="/" onClick={() => setOpen(false)}><Sparkles aria-hidden="true"/><span>全部推荐</span></Link>
        {primaryCategories.map((category) => {
          const Icon = category === "book" ? BookOpen : category === "manga" ? Images : category === "movie" ? Film : category === "anime" ? Tv : Gamepad2;
          return <Link href={`/?category=${category}`} key={category} onClick={() => setOpen(false)}><Icon aria-hidden="true"/><span>{categoryLabels[category]}</span></Link>;
        })}
        <Link href="/?category=other" onClick={() => setOpen(false)}><Shapes aria-hidden="true"/><span>其他</span></Link>
      </div>
    </div>
    <Link href="/wishes"><Sparkles className="category-icon" aria-hidden="true"/><span>许愿箱</span></Link>
    <Link href="/food"><Utensils className="category-icon" aria-hidden="true"/><span>美食家</span></Link>
    <Link href="/marshmallow"><Cloud className="category-icon" aria-hidden="true"/><span>棉花糖</span></Link>
  </div>;
}
