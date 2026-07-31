"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

export function MobileFilterDisclosure({ activeFilterCount, children }: { activeFilterCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return <div className={`filter-disclosure ${open ? "is-open" : ""}`} data-testid="filter-disclosure">
    <button className="filter-disclosure-toggle" type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span className="filter-summary-title"><SlidersHorizontal aria-hidden="true" />搜索与筛选</span>
      <span className="filter-summary-meta">{activeFilterCount ? `${activeFilterCount} 项条件已启用` : "按名称、分类或状态查找"}<ChevronDown className="filter-summary-chevron" aria-hidden="true" /></span>
    </button>
    <div className="filter-disclosure-content">{children}</div>
  </div>;
}
