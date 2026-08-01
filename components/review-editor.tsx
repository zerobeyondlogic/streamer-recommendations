"use client";

import { useRef, useState } from "react";
import { EyeOff, ThumbsDown, ThumbsUp } from "lucide-react";
import { saveSubmissionReviewAction } from "@/app/actions";

export function ReviewEditor({ submissionId, initial }: { submissionId: string; initial?: { recommend: boolean; comment: string | null } | null }) {
  const [recommend, setRecommend] = useState<boolean | null>(initial?.recommend ?? null);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [hint, setHint] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);

  function markSpoiler() {
    const field = textarea.current;
    if (!field || field.selectionStart === field.selectionEnd) {
      setHint("请先在评论框中选中需要打码的文字。");
      field?.focus();
      return;
    }
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const next = `${comment.slice(0, start)}||${comment.slice(start, end)}||${comment.slice(end)}`;
    setComment(next);
    setHint("已标记剧透；发布后需要悬停或聚焦才能看见。 ");
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + 2, end + 2);
    });
  }

  return <form className="panel stack review-editor" action={saveSubmissionReviewAction}>
    <input name="submissionId" type="hidden" value={submissionId}/>
    <input name="recommend" type="hidden" value={recommend === null ? "" : recommend ? "recommend" : "not_recommend"}/>
    <div><span className="review-field-label">玩过之后，你会推荐它吗？</span><div className="review-vote-picker" role="group" aria-label="推荐选择">
      <button className={recommend === true ? "is-selected recommend" : "recommend"} type="button" onClick={() => setRecommend(true)} aria-pressed={recommend === true}><ThumbsUp aria-hidden="true"/>推荐</button>
      <button className={recommend === false ? "is-selected not-recommend" : "not-recommend"} type="button" onClick={() => setRecommend(false)} aria-pressed={recommend === false}><ThumbsDown aria-hidden="true"/>不推荐</button>
    </div></div>
    <label>评论（选填）<textarea ref={textarea} name="comment" maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="像 Steam 评测一样，写下适合哪些人、喜欢或不喜欢的原因……"/><span className="helper">最多 2000 字；BV 号会自动变成链接。`||` 之间的文字会作为剧透打码。</span></label>
    <div className="review-editor-tools"><button className="button small ghost" type="button" onClick={markSpoiler}><EyeOff aria-hidden="true"/>把选中文字标记为剧透</button>{hint ? <span role="status">{hint}</span> : null}</div>
    <button className="button primary" type="submit" disabled={recommend === null}>{initial ? "更新我的评价" : "发布我的评价"}</button>
  </form>;
}
