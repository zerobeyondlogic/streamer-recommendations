"use client";

import { useRef, useState } from "react";
import { EyeOff, ThumbsDown, ThumbsUp } from "lucide-react";
import { saveSubmissionCommentAction, setSubmissionVoteAction } from "@/app/actions";
import type { SubmissionKind } from "@/lib/config";

export function ReviewEditor({ submissionId, kind = "work", initial }: { submissionId: string; kind?: SubmissionKind; initial?: { recommend: boolean | null; comment: string | null } | null }) {
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [hint, setHint] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);

  function markSpoiler() {
    const field = textarea.current;
    if (!field || field.selectionStart === field.selectionEnd) {
      setHint("请先选中文字。");
      field?.focus();
      return;
    }
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const next = `${comment.slice(0, start)}||${comment.slice(start, end)}||${comment.slice(end)}`;
    setComment(next);
    setHint("已标记剧透。");
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + 2, end + 2);
    });
  }

  return <div className="panel stack review-editor">
    <div><span className="review-field-label">{kind === "wish" ? "你也想实现这个愿望吗？" : kind === "food" ? "你也推荐这份美食吗？" : "你会推荐它吗？"}</span><div className="review-vote-picker" role="group" aria-label="推荐选择">
      <form action={setSubmissionVoteAction}><input name="submissionId" type="hidden" value={submissionId}/><input name="recommend" type="hidden" value={initial?.recommend === true ? "clear" : "recommend"}/><button className={initial?.recommend === true ? "is-selected recommend" : "recommend"} type="submit" aria-pressed={initial?.recommend === true}><ThumbsUp aria-hidden="true"/>{kind === "wish" ? "我也想要" : "推荐"}</button></form>
      <form action={setSubmissionVoteAction}><input name="submissionId" type="hidden" value={submissionId}/><input name="recommend" type="hidden" value={initial?.recommend === false ? "clear" : "not_recommend"}/><button className={initial?.recommend === false ? "is-selected not-recommend" : "not-recommend"} type="submit" aria-pressed={initial?.recommend === false}><ThumbsDown aria-hidden="true"/>{kind === "wish" ? "暂不支持" : "不推荐"}</button></form>
    </div><span className="helper review-vote-helper">推荐选择会立即保存，与文字评论互不影响。</span></div>
    <form className="stack review-comment-form" action={saveSubmissionCommentAction}>
      <input name="submissionId" type="hidden" value={submissionId}/>
      <label>评论<textarea ref={textarea} name="comment" maxLength={2000} required value={comment} onChange={(event) => setComment(event.target.value)} placeholder="写下喜欢或不喜欢的原因……"/><span className="helper">最多 2000 字，BV 号会自动链接。</span></label>
      <div className="review-editor-tools"><button className="button small ghost" type="button" onClick={markSpoiler}><EyeOff aria-hidden="true"/>标记剧透</button>{hint ? <span role="status">{hint}</span> : null}</div>
      <button className="button primary" type="submit">{initial?.comment ? "更新我的评论" : kind === "wish" ? "发布留言" : "发布我的评论"}</button>
    </form>
  </div>;
}
