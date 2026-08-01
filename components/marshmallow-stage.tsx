"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Cloud, LockKeyhole, Sparkles } from "lucide-react";
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

export function MarshmallowStage({ current, next, previousId, nextId }: { current: StageItem; next: StageItem | null; previousId: string | null; nextId: string | null }) {
  const [displayed, setDisplayed] = useState(false);
  const afterRemovalId = nextId ?? previousId;
  const afterRemoval = afterRemovalId ? `/host/marshmallows/stage?id=${afterRemovalId}` : "/host/marshmallows/stage";
  const candidate = displayed ? next : current;

  return <div className="marshmallow-stage-workspace">
    <section className={`marshmallow-capture panel ${displayed ? "is-live" : ""}`} aria-live="polite">
      {displayed ? <>
        <Cloud className="marshmallow-cloud" aria-hidden="true"/>
        <BvText className="marshmallow-capture-copy">{current.content}</BvText>
        <form action={readMarshmallowAction}>
          <input name="marshmallowId" type="hidden" value={current.id}/>
          {nextId ? <input name="nextId" type="hidden" value={nextId}/> : null}
          <button className="button primary marshmallow-read-button" type="submit">
            {current.allowPublic ? <><Sparkles aria-hidden="true"/> 公开上墙</> : <><LockKeyhole aria-hidden="true"/> 完成阅读</>}
          </button>
        </form>
      </> : <div className="marshmallow-stage-placeholder"><Cloud aria-hidden="true"/><strong>等待展示</strong><small>点击中间的左箭头。</small></div>}
    </section>

    <aside className="marshmallow-candidate-rail" aria-label="待展示棉花糖">
      <div className="marshmallow-stepper">
        {!displayed && previousId ? <Link href={`/host/marshmallows/stage?id=${previousId}`} aria-label="上一条，更早的棉花糖"><ArrowUp aria-hidden="true"/><span>上一条</span></Link> : <span className="is-disabled"><ArrowUp aria-hidden="true"/><span>{displayed ? "处理中" : "最早"}</span></span>}
        <button className="marshmallow-show-button" type="button" onClick={() => setDisplayed(true)} disabled={displayed || !candidate} aria-label="向左展示这颗棉花糖">
          <ArrowLeft aria-hidden="true"/><span>{displayed ? "已展示" : "展示"}</span>
        </button>
        {!displayed && nextId ? <Link href={`/host/marshmallows/stage?id=${nextId}`} aria-label="下一条，更晚的棉花糖"><ArrowDown aria-hidden="true"/><span>下一条</span></Link> : <span className="is-disabled"><ArrowDown aria-hidden="true"/><span>{displayed ? "处理中" : "最新"}</span></span>}
      </div>

      {candidate ? <article className="marshmallow-candidate-card">
        {!displayed ? <form action={deleteMarshmallowAction}>
          <input name="marshmallowId" type="hidden" value={candidate.id}/>
          <input name="returnTo" type="hidden" value={afterRemoval}/>
          <ConfirmSubmit compact label="移除这颗棉花糖"/>
        </form> : null}
        <div className="marshmallow-candidate-meta"><strong>{candidate.username}</strong><time>{candidate.createdAt}</time></div>
        <BvText className="marshmallow-candidate-copy">{candidate.content}</BvText>
        <span className={`privacy-pill ${candidate.allowPublic ? "can-publish" : "private"}`}>{candidate.allowPublic ? "已允许公开" : "仅神绮爱可见"}</span>
        {displayed ? <span className="displaying-pill">下一条待展示</span> : null}
      </article> : <div className="marshmallow-candidate-card marshmallow-candidate-empty"><Cloud aria-hidden="true"/><strong>后面没有了</strong><span>处理左侧这颗棉花糖即可。</span></div>}
    </aside>
  </div>;
}
