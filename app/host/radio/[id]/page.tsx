import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, Pencil, Plus, Send } from "lucide-react";
import { deleteRadioEntryAction, setRadioEpisodePublishedAction, updateRadioEpisodeAction } from "@/app/radio-actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { requireHost } from "@/lib/auth";
import { getHostRadioEpisode } from "@/lib/radio";

export const metadata: Metadata = { title: "编辑电台主题" };

export default async function HostRadioEpisodePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireHost();
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  const data = await getHostRadioEpisode(id);
  if (!data) notFound();
  const { episode, entries } = data;
  const published = !!episode.publishedAt;

  return <>
    <div className="toolbar"><Link className="button small ghost" href="/host/radio"><ArrowLeft aria-hidden="true"/> 全部期数</Link></div>
    <header className="host-heading host-radio-heading">
      <div><span className="eyebrow">小羊电台 · 第 {episode.episodeNumber} 期</span><h1>{episode.title}</h1><p>整理本期目录，保存故事后统一发布。</p></div>
      {published ? <Link className="button ghost" href={`/radio/${episode.id}`} target="_blank"><ExternalLink aria-hidden="true"/> 查看公开页</Link> : null}
    </header>
    <Notice>{messages.error}</Notice><Notice type="success">{messages.success}</Notice>

    <div className="stack">
      <form className="panel stack" action={updateRadioEpisodeAction}>
        <input name="episodeId" type="hidden" value={episode.id}/>
        <h2 className="host-radio-form-title">本期主题</h2>
        <div className="split">
          <label>期数<input name="episodeNumber" type="number" min={1} step={1} required defaultValue={episode.episodeNumber}/></label>
          <label>主题标题<input name="title" maxLength={120} required defaultValue={episode.title}/></label>
        </div>
        <div className="form-actions"><button className="button small ghost" type="submit">保存主题</button></div>
      </form>

      <section className="panel host-radio-publish" aria-label="本期发布状态">
        <div className="host-radio-row-main">
          <span className={published ? "published-pill" : "category"}>{published ? "已发布" : "草稿"}</span>
          <p className="helper">{published ? "本期已在电台展示，保存修改后会同步更新。" : "准备好目录和正文后，整期发布到电台。"}</p>
        </div>
        <form action={setRadioEpisodePublishedAction}>
          <input name="episodeId" type="hidden" value={episode.id}/>
          <input name="published" type="hidden" value={published ? "false" : "true"}/>
          {published ? <ConfirmSubmit label="撤回为草稿" title="将这一期撤回为草稿？" description="撤回后，访客将无法查看本期主题、目录和正文。内容会保留，可随时重新发布。" confirmLabel="确认撤回"/> : <button className="button primary" type="submit" disabled={!entries.length}><Send aria-hidden="true"/> 发布本期</button>}
        </form>
      </section>
    </div>

    <div className="host-radio-section-heading">
      <div><h2>本期目录</h2><span className="helper">共 {entries.length} 篇 · 按排序数字从小到大展示</span></div>
      <Link className="button small primary" href={`/host/radio/${episode.id}/entries/new`}><Plus aria-hidden="true"/> 添加内容</Link>
    </div>
    <div className="host-list">
      {entries.map((entry, index) => <article className="panel host-radio-row" key={entry.id}>
        <div className="host-radio-row-main">
          <div className="card-top"><span className="category">{entry.kind === "submission" ? "观众投稿" : "故事"}</span><span className="helper">排序 {entry.position}</span></div>
          <h2><Link href={`/host/radio/${episode.id}/entries/${entry.id}`}>{String(index + 1).padStart(2, "0")} · {entry.title}</Link></h2>
        </div>
        <div className="record-actions">
          <Link className="button small ghost" href={`/host/radio/${episode.id}/entries/${entry.id}`}><Pencil aria-hidden="true"/> 编辑</Link>
          <form action={deleteRadioEntryAction}>
            <input name="episodeId" type="hidden" value={episode.id}/><input name="entryId" type="hidden" value={entry.id}/>
            <ConfirmSubmit label="删除" title="永久删除这篇内容？" description="正文与目录条目将一并删除，删除后无法恢复。" confirmLabel="确认删除"/>
          </form>
        </div>
      </article>)}
      {!entries.length ? <div className="empty-state"><BookOpen aria-hidden="true"/><h3>本期目录还是空的</h3><p>添加第一篇故事，或录入一篇收录的观众投稿。</p><Link className="button ghost" href={`/host/radio/${episode.id}/entries/new`}><Plus aria-hidden="true"/> 添加第一篇</Link></div> : null}
    </div>
  </>;
}
