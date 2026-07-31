import { tokenizeBvText } from "@/lib/bilibili";

export function BvText({ children, className }: { children: string; className?: string }) {
  return <span className={className}>{tokenizeBvText(children).map((token, index) => token.type === "bv"
    ? <a className="bv-link" href={token.href} target="_blank" rel="noopener noreferrer nofollow" key={`${token.value}-${index}`}>{token.value}</a>
    : <span key={`text-${index}`}>{token.value}</span>)}</span>;
}
