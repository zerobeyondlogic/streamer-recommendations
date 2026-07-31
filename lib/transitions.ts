export function firstOpenPatch(hostReadAt: Date | null, now: Date) {
  if (hostReadAt) return null;
  return { hostReadAt: now, publishedAt: now, feedActivityAt: now, updatedAt: now };
}

export function replyEffects(existing: boolean, republish: boolean, notifyAgain: boolean, now: Date) {
  if (!existing) return { feedActivityAt: now, notificationType: "host_reply" as const };
  return { feedActivityAt: republish ? now : null, notificationType: republish && notifyAgain ? "host_reply_updated" as const : null };
}

export function pinSortKey(pinnedAt: Date | null, feedActivityAt: Date | null) {
  return [pinnedAt ? 1 : 0, pinnedAt?.getTime() ?? 0, feedActivityAt?.getTime() ?? 0] as const;
}
