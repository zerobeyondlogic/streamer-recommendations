import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function RadioBreadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav className="radio-breadcrumbs" aria-label="电台页面导航">
    <ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>
      {index > 0 ? <ChevronRight aria-hidden="true"/> : null}
      {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
    </li>)}</ol>
  </nav>;
}
