"use client";

import { ThumbsUp } from "lucide-react";
import { useOptimistic } from "react";
import { useFormStatus } from "react-dom";
import { toggleQuickLikeAction } from "@/app/actions";

type QuickLikeTarget = "submission" | "marshmallow" | "musing";

export function QuickLikeButton({
  targetType,
  targetId,
  count,
  liked,
  isLoggedIn,
  label = "点赞",
}: {
  targetType: QuickLikeTarget;
  targetId: string;
  count: number;
  liked: boolean;
  isLoggedIn: boolean;
  label?: string;
}) {
  const [optimistic, updateOptimistic] = useOptimistic({ liked, count }, (current) => ({
    liked: !current.liked,
    count: Math.max(0, current.count + (current.liked ? -1 : 1)),
  }));
  const className = `quick-like-button${optimistic.liked ? " is-liked" : ""}`;
  const accessibleLabel = `${optimistic.liked ? "取消" : ""}${label}，当前 ${optimistic.count}`;

  if (!isLoggedIn) {
    return <button className={className} type="button" disabled aria-label={`登录后${label}，当前 ${count}`} title={`登录后${label}`}>
      <ThumbsUp aria-hidden="true"/><b>{count}</b>
    </button>;
  }

  async function submit(form: FormData) {
    updateOptimistic(undefined);
    await toggleQuickLikeAction(form);
  }

  return <form className="quick-like-form" action={submit}>
    <input name="targetType" type="hidden" value={targetType}/>
    <input name="targetId" type="hidden" value={targetId}/>
    <LikeSubmitButton className={className} liked={optimistic.liked} count={optimistic.count} label={label} accessibleLabel={accessibleLabel}/>
  </form>;
}

function LikeSubmitButton({ className, liked, count, label, accessibleLabel }: { className: string; liked: boolean; count: number; label: string; accessibleLabel: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending} aria-busy={pending} aria-pressed={liked} aria-label={accessibleLabel} title={liked ? `取消${label}` : label}>
    <ThumbsUp aria-hidden="true"/><b>{count}</b>
  </button>;
}
