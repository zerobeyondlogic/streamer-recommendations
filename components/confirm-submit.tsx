"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

export function ConfirmSubmit({
  label = "移除",
  title = "确认移除这颗棉花糖？",
  description = "移出展示队列，之后可恢复。",
  confirmLabel = "确认移除",
  compact = false,
}: {
  label?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  return <>
    <button className={compact ? "marshmallow-remove-icon" : "button small danger"} type="button" onClick={() => setOpen(true)} aria-label={compact ? label : undefined}>
      {compact ? <X aria-hidden="true" /> : label}
    </button>
    {open ? <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="confirm-mark" aria-hidden="true">!</span>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
        <div className="form-actions">
          <button className="button ghost" type="button" ref={cancelRef} onClick={() => setOpen(false)}>取消</button>
          <button className="button danger" type="submit">{confirmLabel}</button>
        </div>
      </section>
    </div> : null}
  </>;
}
