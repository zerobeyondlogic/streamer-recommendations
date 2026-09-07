"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Cloud, LockKeyhole, MessageSquareReply, Sparkles } from "lucide-react";
import { deleteMarshmallowAction, publishMarshmallowAction, readMarshmallowAction } from "@/app/actions";
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
  const stageReturnTo = nextId ? `/host/marshmallows/stage?id=${nextId}` : "/host/marshmallows/stage";

  return <div className="marshmallow-stage-workspace">
    <div className="marshmallow-capture-column">
    <section className={`marshmallow-capture panel ${displayed && current.allowPublic ? "is-live" : ""}`} aria-live="polite">
      {displayed && current.allowPublic ? <>
        <Cloud className="marshmallow-cloud" aria-hidden="true"/>
        <BvText className="marshmallow-capture-copy">{current.content}</BvText>
      </> : <div className="marshmallow-stage-placeholder"><Cloud aria-hidden="true"/><strong>等待展示</strong><small>点击中间的左箭头。</small></div>}
    </section>
    {displayed ? <div className="marshmallow-stage-completion">
      <form action={readMarshmallowAction}><input name="marshmallowId" type="hidden" value={current.id}/><input name="returnTo" type="hidden" value={stageReturnTo}/>{nextId ? <input name="nextId" type="hidden" value={nextId}/> : null}<button className="button ghost" type="submit"><Check aria-hidden="true"/> 标记已读</button></form>
      {current.allowPublic ? <form action={publishMarshmallowAction}><input name="marshmallowId" type="hidden" value={current.id}/><input name="returnTo" type="hidden" value={stageReturnTo}/>{nextId ? <input name="nextId" type="hidden" value={nextId}/> : null}<button className="button primary" type="submit"><Sparkles aria-hidden="true"/> 公开上墙</button></form> : null}
    </div> : null}
    </div>

    <aside className="marshmallow-candidate-rail" aria-label="待展示棉花糖">
      <div className="marshmallow-stepper">
        {!displayed && previousId ? <Link href={`/host/marshmallows/stage?id=${previousId}`} aria-label="上一条，更早的棉花糖"><ArrowUp aria-hidden="true"/><span>上一条</span></Link> : <span className="is-disabled"><ArrowUp aria-hidden="true"/><span>{displayed ? "处理中" : "最早"}</span></span>}
        <button className="marshmallow-show-button" type="button" onClick={() => { if (current.allowPublic) setDisplayed(true); }} disabled={displayed || !current.allowPublic} aria-label={displayed ? "当前棉花糖已展示" : current.allowPublic ? "向左展示这颗棉花糖" : "私密棉花糖不可展示"}>
          {current.allowPublic ? <ArrowLeft aria-hidden="true"/> : <LockKeyhole aria-hidden="true"/>}<span>{displayed ? "已展示" : current.allowPublic ? "展示" : "私密"}</span>
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
        {!displayed ? <div className="marshmallow-candidate-actions">
          {!candidate.allowPublic ? <span className="helper">私密内容只在这里阅读，不会进入展示区。</span> : null}
          <form action={readMarshmallowAction}><input name="marshmallowId" type="hidden" value={current.id}/><input name="returnTo" type="hidden" value={stageReturnTo}/>{nextId ? <input name="nextId" type="hidden" value={nextId}/> : null}<button className="button small ghost" type="submit"><Check aria-hidden="true"/> 标记已读</button></form>
          <Link className="button small ghost" href={`/host/marshmallows?status=all#marshmallow-${current.id}`}><MessageSquareReply aria-hidden="true"/> 回复</Link>
        </div> : null}
      </article> : <div className="marshmallow-candidate-card marshmallow-candidate-empty"><Cloud aria-hidden="true"/><strong>后面没有了</strong><span>处理左侧这颗棉花糖即可。</span></div>}
    </aside>
  </div>;
}
