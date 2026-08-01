import { notFound } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { openSubmissionAction, pinAction, replyAction, restoreAction, scoreAction, softDeleteAction, statusAction } from "@/app/actions";
import { BvText } from "@/components/bv-text";
import { Notice } from "@/components/notice";
import { StyledSelect } from "@/components/styled-select";
import { categoryLabels, contentStatusLabel, contentStatuses, submissionKind, submissionKindLabels } from "@/lib/config";
import { getHostSubmission } from "@/lib/data";
import { formatDate } from "@/lib/view";

export default async function HostSubmissionPage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<{error?:string;success?:string}> }) {
  const [{id}, messages] = await Promise.all([params, searchParams]);
  const item = await getHostSubmission(id);
  if (!item) notFound();
  const kind = submissionKind(item.category);
  const returnTo = `/host/submission/${item.id}`;

  if (!item.hostReadAt) return <>
    <header className="host-heading compact"><div><span className="eyebrow">未审核 · {submissionKindLabels[kind]}</span><h1>{item.title}</h1><p>审核通过后公开到{submissionKindLabels[kind]}。</p></div></header>
    <section className="panel stack"><p className="description">{item.description || (kind === "wish" ? "没有补充愿望说明。" : "没有填写推荐介绍。")}</p>{item.externalUrl ? <a className="external-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer nofollow">相关链接 ↗</a> : null}<form action={openSubmissionAction}><input type="hidden" name="submissionId" value={item.id}/><button className="button primary" type="submit">审核并公开</button></form></section>
  </>;

  const allowedStatuses = kind === "wish" ? contentStatuses.filter((status) => status === "pending" || status === "completed") : contentStatuses;
  const replyTitle = kind === "wish" ? "神绮爱回应" : kind === "food" ? "试吃感想" : "神绮爱感想";
  return <>
    <header className="host-heading compact"><div><span className="eyebrow">{item.source === "host" ? "神绮爱原创" : "观众投稿"} · {submissionKindLabels[kind]}</span><h1>{item.title}</h1><p>{categoryLabels[item.category]} · {item.source === "host" ? "神绮爱" : item.username} · {formatDate(item.createdAt)}</p></div></header>
    <Notice>{messages.error}</Notice><Notice type="success">{messages.success}</Notice>

    {kind === "wish" && item.contentStatus !== "completed" ? <form className="panel wish-complete-callout" action={statusAction}>
      <div className="wish-complete-icon"><Sparkles aria-hidden="true"/></div><div><strong>这个愿望已经实现了吗？</strong><p>完成后仍保留在许愿箱，并显示为“已完成”。</p></div>
      <input type="hidden" name="submissionId" value={item.id}/><input type="hidden" name="returnTo" value={returnTo}/><input type="hidden" name="contentStatus" value="completed"/>
      <button className="button primary" type="submit"><Check aria-hidden="true"/>标记已完成</button>
    </form> : null}

    <section className="panel detail-panel">
      <div className="card-top"><span className={`collection-pill collection-pill-${kind}`}>{submissionKindLabels[kind]}</span><span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span>{item.source === "host" ? <span className="host-badge">神绮爱原创</span> : null}<span className="status">{contentStatusLabel(item.category,item.contentStatus)}</span>{item.score && kind !== "wish" ? <span className="score compact-score"><b>{item.score}</b><small>/10</small></span> : null}{item.anonymousPublic ? <span className="pin">公开匿名</span> : null}{item.pinnedAt ? <span className="pin">已置顶</span> : null}</div>
      <h2>{kind === "wish" ? "愿望说明" : "推荐理由"}</h2><p className="description prewrap">{item.description ? <BvText>{item.description}</BvText> : kind === "wish" ? "没有补充愿望说明。" : "暂无推荐理由。"}</p>
      {item.externalUrl ? <a className="external-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer nofollow">相关链接 ↗</a> : null}
      <div className="record-meta"><span>{item.source === "host" ? "创建于" : "查看于"} {formatDate(item.hostReadAt)}</span><span>公开于 {formatDate(item.publishedAt)}</span></div>
    </section>

    <div className={`host-edit-grid host-edit-grid-${kind}`}>
      <form className="panel stack" action={statusAction}><h2>{kind === "wish" ? "完成状态" : "体验状态"}</h2><input type="hidden" name="submissionId" value={item.id}/><input type="hidden" name="returnTo" value={returnTo}/><StyledSelect name="contentStatus" label="状态" defaultValue={item.contentStatus} options={allowedStatuses.map((status)=>({value:status,label:contentStatusLabel(item.category,status)}))}/><button className="button secondary" type="submit">更新状态</button>{kind !== "wish" ? <span className="helper">非完成状态会清除评分。</span> : null}</form>
      {kind !== "wish" ? <form className="panel stack" action={scoreAction}><h2>神绮爱评分</h2><input type="hidden" name="submissionId" value={item.id}/><input type="hidden" name="returnTo" value={returnTo}/><StyledSelect name="score" label="10 分制" defaultValue={String(item.score??"")} disabled={item.contentStatus!=="completed"} options={[{value:"",label:"暂不评分"},...[10,9,8,7,6,5,4,3,2,1].map((score)=>({value:String(score),label:`${score} / 10`}))]}/><button className="button secondary" type="submit" disabled={item.contentStatus!=="completed"}>保存评分</button><span className="helper">仅完成状态可评分。</span></form> : null}
      <form className="panel stack" action={pinAction}><h2>{item.pinnedAt ? kind === "wish" ? "管理预定" : "管理置顶" : kind === "wish" ? "标记为预定要做" : `置顶到${submissionKindLabels[kind]}`}</h2><input type="hidden" name="submissionId" value={item.id}/><input type="hidden" name="returnTo" value={returnTo}/><input type="hidden" name="pin" value={item.pinnedAt ? "false" : "true"}/>{!item.pinnedAt ? <label>{kind === "wish" ? "预定说明（选填）" : "推荐语（选填）"}<textarea name="pinNote" maxLength={300} defaultValue={item.pinNote??""}/></label> : <p className="helper">{item.pinNote || (kind === "wish" ? "无预定说明" : "无推荐语")}</p>}<button className="button ghost" type="submit">{item.pinnedAt ? kind === "wish" ? "取消预定" : "取消置顶" : kind === "wish" ? "确认预定" : "确认置顶"}</button></form>
    </div>

    <form className="panel stack reply-editor" action={replyAction}><h2>{replyTitle}</h2><input type="hidden" name="submissionId" value={item.id}/><label>{kind === "wish" ? "回应" : "感想"}<textarea name="reply" required minLength={1} maxLength={4000} defaultValue={item.reply??""} placeholder={kind === "wish" ? "回应这个愿望，BV 号会自动链接。" : "记录真实体验，BV 号会自动链接。"}/></label>{item.reply ? <><label className="checkbox"><input type="checkbox" name="republish"/><span>重新推到栏目顶部<span className="helper">不重复通知。</span></span></label>{item.source === "user" ? <label className="checkbox"><input type="checkbox" name="notifyAgain"/><span>再次提醒投稿者</span></label> : null}</> : null}<button className="button primary" type="submit">{item.reply ? "保存修改" : item.source === "host" ? "发布内容" : "发布并通知"}</button></form>

    <section className="danger-zone panel"><div><h2>{item.deletedAt ? "恢复投稿" : "删除投稿"}</h2><p>{item.deletedAt ? `恢复到${submissionKindLabels[kind]}。` : "从公开页隐藏，可恢复。"}</p></div><form action={item.deletedAt?restoreAction:softDeleteAction}><input type="hidden" name="submissionId" value={item.id}/><input type="hidden" name="returnTo" value="/host/library"/><button className={`button ${item.deletedAt?"ghost":"danger"}`} type="submit">{item.deletedAt?"恢复投稿":"删除投稿"}</button></form></section>
  </>;
}
