"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";
import { setQuickSubmissionVoteAction } from "@/app/actions";

type Vote = boolean | null;
type VoteState = { recommend: Vote; likes: number; dislikes: number };

function nextVoteState(current: VoteState, requested: boolean): VoteState {
  const next = current.recommend === requested ? null : requested;
  let likes = current.likes;
  let dislikes = current.dislikes;
  if (current.recommend === true) likes -= 1;
  if (current.recommend === false) dislikes -= 1;
  if (next === true) likes += 1;
  if (next === false) dislikes += 1;
  return { recommend: next, likes: Math.max(0, likes), dislikes: Math.max(0, dislikes) };
}

export function QuickVoteControls({
  submissionId,
  recommendCount,
  notRecommendCount,
  currentUserRecommend,
  isLoggedIn,
  positiveLabel = "喜欢",
  negativeLabel = "不喜欢",
}: {
  submissionId: string;
  recommendCount: number;
  notRecommendCount: number;
  currentUserRecommend: Vote;
  isLoggedIn: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
}) {
  const [state, setState] = useState<VoteState>({ recommend: currentUserRecommend, likes: recommendCount, dislikes: notRecommendCount });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function vote(requested: boolean) {
    if (!isLoggedIn || pending) return;
    const previous = state;
    const optimistic = nextVoteState(previous, requested);
    setState(optimistic);
    setError("");
    const form = new FormData();
    form.set("submissionId", submissionId);
    form.set("recommend", optimistic.recommend === null ? "clear" : optimistic.recommend ? "recommend" : "not_recommend");
    startTransition(async () => {
      try {
        const result = await setQuickSubmissionVoteAction(form);
        if (!result.ok) {
          setState(previous);
          setError(result.error);
        }
      } catch {
        setState(previous);
        setError("操作失败，请稍后再试");
      }
    });
  }

  const disabledTitle = isLoggedIn ? undefined : "登录后可选择喜欢或不喜欢";
  return <div className="quick-vote-controls" title={error || disabledTitle}>
    <button type="button" className={`quick-vote-button is-positive${state.recommend === true ? " is-selected" : ""}`} disabled={!isLoggedIn || pending} aria-busy={pending} aria-pressed={state.recommend === true} aria-label={`${state.recommend === true ? "取消" : ""}${positiveLabel}，当前 ${state.likes}`} title={disabledTitle ?? (state.recommend === true ? `取消${positiveLabel}` : positiveLabel)} onClick={() => vote(true)}>
      <ThumbsUp aria-hidden="true"/><b>{state.likes}</b>
    </button>
    <button type="button" className={`quick-vote-button is-negative${state.recommend === false ? " is-selected" : ""}`} disabled={!isLoggedIn || pending} aria-busy={pending} aria-pressed={state.recommend === false} aria-label={`${state.recommend === false ? "取消" : ""}${negativeLabel}，当前 ${state.dislikes}`} title={disabledTitle ?? (state.recommend === false ? `取消${negativeLabel}` : negativeLabel)} onClick={() => vote(false)}>
      <ThumbsDown aria-hidden="true"/><b>{state.dislikes}</b>
    </button>
    {error ? <span className="quick-vote-error" role="status">{error}</span> : null}
  </div>;
}
