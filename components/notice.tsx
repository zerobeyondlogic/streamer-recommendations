export function Notice({ children, type = "error" }: { children?: React.ReactNode; type?: "error" | "success" | "info" }) {
  if (!children) return null;
  return <div className={`notice notice-${type}`} role={type === "error" ? "alert" : "status"}>{type === "success" ? "✓" : type === "info" ? "i" : "!"}<span>{children}</span></div>;
}
