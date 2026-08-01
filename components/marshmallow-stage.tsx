"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, MailOpen } from "lucide-react";
import { deleteMarshmallowAction, readMarshmallowAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { ConfirmSubmit } from "@/components/confirm-submit";

type StageItem = {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  allowPublic: boolean;
};

export function MarshmallowStage({ current, previousId, nextId }: { current: StageItem; previousId: string | null; nextId: string | null }) {
  const [displayed, setDisplayed] = useState(false);
  const afterRemovalId = nextId ?? previousId;
  const afterRemoval = afterRemovalId ? `/host/marshmallows/stage?id=${afterRemovalId}` : "/host/marshmallows/stage";

  return <div className="marshmallow-stage-workspace">
    <section className={`marshmallow-capture panel ${displayed ? "is-live" : ""}`} aria-live="polite">
      {displayed ? <>
        <span className="marshmallow-cloud" aria-hidden="true">☁</span>
        <BvText className="marshmallow-capture-copy">{current.content}</BvText>
        <form action={readMarshmallowAction}>
          <input name="marshmallowId" type="hidden" value={current.id}/>
          {nextId ? <input name="nextId" type="hidden" value={nextId}/> : null}
          <button className="button primary marshmallow-read-button" type="submit"><MailOpen aria-hidden="true"/> 已读</button>
        </form>
      </> : <div className="marshmallow-stage-placeholder"><span aria-hidden="true">☁︎</span><strong>展示区已准备好</strong><small>右侧内容不会出现在这里，直到你点击“展示”。</small></div>}
    </section>

    <aside className="marshmallow-candidate-rail" aria-label="待展示棉花糖">
      <div className="marshmallow-stepper">
        {previousId ? <Link href={`/host/marshmallows/stage?id=${previousId}`} aria-label="上一条，更早的棉花糖"><ArrowUp aria-hidden="true"/><span>上一条</span></Link> : <span className="is-disabled"><ArrowUp aria-hidden="true"/><span>最早</span></span>}
        {nextId ? <Link href={`/host/marshmallows/stage?id=${nextId}`} aria-label="下一条，更晚的棉花糖"><ArrowDown aria-hidden="true"/><span>下一条</span></Link> : <span className="is-disabled"><ArrowDown aria-hidden="true"/><span>最新</span></span>}
      </div>

      <article className={`marshmallow-candidate-card ${displayed ? "is-displayed" : ""}`}>
        <form action={deleteMarshmallowAction}>
          <input name="marshmallowId" type="hidden" value={current.id}/>
          <input name="returnTo" type="hidden" value={afterRemoval}/>
          <ConfirmSubmit compact label="移除这颗棉花糖"/>
        </form>
        <div className="marshmallow-candidate-meta"><strong>{current.username}</strong><time>{current.createdAt}</time></div>
        <BvText className="marshmallow-candidate-copy">{current.content}</BvText>
        <span className={`privacy-pill ${current.allowPublic ? "can-publish" : "private"}`}>{current.allowPublic ? "已允许公开" : "仅神绮爱可见"}</span>
        {displayed ? <span className="displaying-pill">正在中间展示</span> : null}
      </article>

      <button className="marshmallow-show-button" type="button" onClick={() => setDisplayed(true)} disabled={displayed}>
        <Eye aria-hidden="true"/><span>{displayed ? "展示中" : "展示"}</span>
      </button>
    </aside>
  </div>;
}
