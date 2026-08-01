import { HostSidebar } from "@/components/host-sidebar";
import { requireHost } from "@/lib/auth";
import { getSettings } from "@/lib/data";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const [, settings] = await Promise.all([requireHost(), getSettings()]);
  return <div className="host-shell"><HostSidebar siteName={settings.siteName}/><div className="host-content">{children}</div></div>;
}
