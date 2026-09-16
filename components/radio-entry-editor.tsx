"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { saveRadioEntryAction } from "@/app/radio-actions";
import { Notice } from "@/components/notice";
import { StyledSelect } from "@/components/styled-select";

type EditableRadioEntry = {
  id: string;
  title: string;
  content: string;
  kind: "story" | "submission";
  position: number;
};

export function RadioEntryEditor({ episodeId, entry, nextPosition }: {
  episodeId: string;
  entry?: EditableRadioEntry;
  nextPosition: number;
}) {
  const [state, action, pending] = useActionState(saveRadioEntryAction, {});
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [kind, setKind] = useState(entry?.kind ?? "story");
  const [position, setPosition] = useState(String(entry?.position ?? nextPosition));

  return <form className="panel stack host-radio-editor" action={action}>
    <input name="episodeId" type="hidden" value={episodeId}/>
    {entry ? <input name="entryId" type="hidden" value={entry.id}/> : null}
    <Notice>{state.error}</Notice>
    <div className="split">
      <StyledSelect name="kind" label="内容类型" value={kind} onValueChange={(value) => setKind(value as "story" | "submission")} options={[{ value: "story", label: "故事" }, { value: "submission", label: "观众投稿" }]}/>
      <label>目录排序<input name="position" type="number" min={0} step={1} required value={position} onChange={(event) => setPosition(event.target.value)}/><span className="helper">数字越小，越靠前。</span></label>
    </div>
    {kind === "submission" ? <span className="helper">录入从其他渠道收录的投稿；可在正文中注明投稿人。</span> : null}
    <label>标题<input name="title" maxLength={160} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "submission" ? "这篇投稿的标题" : "这个故事叫什么名字"}/></label>
    <label>正文<textarea name="content" maxLength={50000} required rows={18} value={content} onChange={(event) => setContent(event.target.value)} placeholder="把故事写在这里，保留段落与换行…"/><span className="helper host-radio-editor-count">{content.length.toLocaleString("zh-CN")} / 50,000 字</span></label>
    <div className="form-actions"><button className="button primary" type="submit" disabled={pending}><Save aria-hidden="true"/>{pending ? "保存中…" : "保存并返回目录"}</button><Link className="button ghost" href={`/host/radio/${episodeId}`}>取消</Link></div>
  </form>;
}
