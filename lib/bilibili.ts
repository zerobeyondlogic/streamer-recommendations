export type BvTextToken = { type: "text"; value: string } | { type: "bv"; value: string; href: string };

const BV_PATTERN = /(?<![0-9A-Za-z])BV[0-9A-Za-z]{10}(?![0-9A-Za-z])/g;

export function tokenizeBvText(value: string): BvTextToken[] {
  const tokens: BvTextToken[] = [];
  let cursor = 0;
  for (const match of value.matchAll(BV_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ type: "text", value: value.slice(cursor, index) });
    tokens.push({ type: "bv", value: match[0], href: `https://www.bilibili.com/video/${match[0]}/` });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) tokens.push({ type: "text", value: value.slice(cursor) });
  return tokens.length ? tokens : [{ type: "text", value }];
}
