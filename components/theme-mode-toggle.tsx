"use client";

import { MoonStar } from "lucide-react";

const storageKey = "akofans-color-mode";

export function ThemeModeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.colorMode === "dark" ? "light" : "dark";
    document.documentElement.dataset.colorMode = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem(storageKey, next);
  }
  return <button className="theme-mode-toggle" type="button" onClick={toggle} aria-label="切换日间或夜间模式" title="切换日间或夜间模式">
    <MoonStar className="nav-icon" aria-hidden="true"/>
    <span className="nav-action-label">明暗</span>
  </button>;
}
