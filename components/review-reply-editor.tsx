"use client";

import { useRef, useState } from "react";
import { EyeOff, Send } from "lucide-react";
import { createReviewReplyAction, updateReviewReplyAction } from "@/app/actions";

export function ReviewReplyEditor({
  submissionId,
  reviewId,
  reviewPage,
  replyToReplyId,
  replyToUsername,
  replyId,
  initialContent = "",
}: {
  submissionId: string;
  reviewId: string;
  reviewPage: number;
  replyToReplyId?: string;
  replyToUsername?: string | null;
  replyId?: string;
  initialContent?: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [hint, setHint] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const action = replyId ? updateReviewReplyAction : createReviewReplyAction;

  function markSpoiler() {
    const field = textarea.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = content.slice(start, end);
    const next = `${content.slice(0, start)}||${selected || "剧透内容"}||${content.slice(end)}`;
    setContent(next);
    setHint("已用 || 包住剧透内容");
    requestAnimationFrame(() => {
      const cursor = start + 2 + (selected || "剧透内容").length;
      field.focus();
      field.setSelectionRange(cursor, cursor);
    });
  }

  return <form className="review-reply-editor" action={action}>
    <input name="submissionId" type="hidden" value={submissionId}/>
    <input name="reviewId" type="hidden" value={reviewId}/>
    <input name="reviewPage" type="hidden" value={reviewPage}/>
    {replyToReplyId ? <input name="replyToReplyId" type="hidden" value={replyToReplyId}/> : null}
    {replyId ? <input name="replyId" type="hidden" value={replyId}/> : null}
    <label>
      <span>{replyId ? "修改回复" : replyToUsername ? `回复 @${replyToUsername}` : "回复这条评价"}</span>
      <textarea ref={textarea} name="content" maxLength={1500} required value={content} onChange={(event) => setContent(event.target.value)} placeholder="写下回复……"/>
    </label>
    <div className="review-reply-editor-actions">
      <button className="button small ghost" type="button" onClick={markSpoiler}><EyeOff aria-hidden="true"/>标记剧透</button>
      {hint ? <span role="status">{hint}</span> : <span className="helper">最多 1500 字，BV 号会自动链接。</span>}
      <button className="button small primary" type="submit"><Send aria-hidden="true"/>{replyId ? "保存" : "回复"}</button>
    </div>
  </form>;
}
