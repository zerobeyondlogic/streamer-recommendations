export type SpoilerSegment = { text: string; spoiler: boolean };

export function parseSpoilerText(value: string): SpoilerSegment[] {
  const parts = value.split("||");
  if (parts.length === 1) return [{ text: value, spoiler: false }];
  return parts.map((text, index) => ({ text, spoiler: index % 2 === 1 })).filter((segment) => segment.text.length > 0);
}

export function hasBalancedSpoilers(value: string) {
  return (value.match(/\|\|/g)?.length ?? 0) % 2 === 0;
}

export function recommendationScore(votes: boolean[]) {
  return votes.reduce((total, recommend) => total + (recommend ? 1 : -1), 0);
}
