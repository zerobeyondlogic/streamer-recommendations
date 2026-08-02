"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserX, X } from "lucide-react";
import { rejectBilibiliUserAction } from "@/app/actions";

export function RejectUserControl({ userId, username }: { userId: string; username: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    messageRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return <>
    <button className="button small ghost" type="button" onClick={() => setOpen(true)}>不批准</button>
    {open ? createPortal(<div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <form className="confirm-dialog reject-user-dialog" action={rejectBilibiliUserAction} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="dialog-close" type="button" aria-label="关闭" onClick={() => setOpen(false)}><X aria-hidden="true"/></button>
        <span className="confirm-mark" aria-hidden="true"><UserX/></span>
        <h2 id={titleId}>不批准 {username}</h2>
        <p>写明 UID 无法核验的原因。用户登录后会看到这封回信，并可更新 UID 后重新提交。</p>
        <input name="userId" type="hidden" value={userId}/>
        <label>给用户的回信
          <textarea ref={messageRef} name="message" minLength={1} maxLength={500} rows={5} placeholder="例如：当前 UID 与主页验证码不一致，请填写本人可公开核验的 UID。" required/>
          <span className="helper">最多 500 字。</span>
        </label>
        <div className="form-actions">
          <button className="button ghost" type="button" onClick={() => setOpen(false)}>取消</button>
          <button className="button danger" type="submit">发送回信并拒绝</button>
        </div>
      </form>
    </div>, document.body) : null}
  </>;
}
