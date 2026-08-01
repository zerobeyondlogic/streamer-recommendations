const zhDateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Shanghai",
});

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return zhDateTimeFormatter.format(new Date(value));
}
