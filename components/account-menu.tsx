"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ClipboardList, LayoutDashboard, LogOut, Send, Sparkles, X } from "lucide-react";
import { logoutAction } from "@/app/actions";

export function AccountMenu({ isHost }: { isHost: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <div className={`account-menu ${open ? "is-open" : ""}`} ref={wrapperRef}>
    <button
      className="account-menu-trigger"
      type="button"
      ref={triggerRef}
      aria-expanded={open}
      aria-controls="account-menu-panel"
      onClick={() => setOpen((value) => !value)}
    >
      {open ? <X className="nav-icon" aria-hidden="true"/> : <Sparkles className="nav-icon" aria-hidden="true"/>}
      <span className="nav-action-label">菜单</span>
      <ChevronDown className="account-menu-chevron" aria-hidden="true"/>
    </button>
    {open ? <div className="account-menu-panel" id="account-menu-panel" aria-label="账户菜单">
      <Link href="/submit" onClick={() => setOpen(false)}><Send aria-hidden="true"/><span>去投稿</span></Link>
      <Link href="/me/submissions" onClick={() => setOpen(false)}><ClipboardList aria-hidden="true"/><span>我的投稿</span></Link>
      {isHost ? <Link href="/host" onClick={() => setOpen(false)}><LayoutDashboard aria-hidden="true"/><span>工作台</span></Link> : null}
      <form action={logoutAction}><button type="submit"><LogOut aria-hidden="true"/><span>退出</span></button></form>
    </div> : null}
  </div>;
}
