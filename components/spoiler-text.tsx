import { BvText } from "@/components/bv-text";
import { parseSpoilerText } from "@/lib/spoilers";

export function SpoilerText({ children, className }: { children: string; className?: string }) {
  return <span className={className}>{parseSpoilerText(children).map((segment, index) => segment.spoiler
    ? <span className="spoiler-mask" tabIndex={0} aria-label="剧透内容，悬停或聚焦后显示" key={index}><BvText>{segment.text}</BvText></span>
    : <BvText key={index}>{segment.text}</BvText>)}</span>;
}
