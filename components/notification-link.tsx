"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";

export function NotificationLink({ unread }: { unread: number }) {
  const pathname = usePathname();
  const active = pathname === "/me/notifications";

  return <Link
    href="/me/notifications"
    className={`notification-link${active ? " is-active" : ""}`}
    aria-current={active ? "page" : undefined}
    aria-label={unread > 0 ? `消息，${unread} 条未读` : "消息"}
  >
    <Bell className="nav-icon" aria-hidden="true"/>
    <span className="nav-action-label">消息</span>
    {unread > 0 ? <span className="badge">{unread > 99 ? "99+" : unread}</span> : null}
  </Link>;
}
