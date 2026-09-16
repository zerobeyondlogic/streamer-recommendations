import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Plus, Radio } from "lucide-react";
import { createRadioEpisodeAction } from "@/app/radio-actions";
import { Notice } from "@/components/notice";
import { requireHost } from "@/lib/auth";
import { getHostRadioEpisodes } from "@/lib/radio";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "小羊电台管理" };

export default async function HostRadioPage({ searchParams }: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireHost();
  const [params, episodes] = await Promise.all([searchParams, getHostRadioEpisodes()]);
  const nextEpisodeNumber = episodes.reduce((maximum, episode) => Math.max(maximum, episode.episodeNumber), 0) + 1;

  return <>
    <header className="host-heading host-radio-heading">
      <div><span className="eyebrow">主播内容</span><h1>小羊电台</h1><p>把直播里的故事，收进每一期的主题里。</p></div>
      <Link className="button ghost" href="/radio" target="_blank"><ExternalLink aria-hidden="true"/> 查看电台</Link>
    </header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>

    <form className="panel stack" action={createRadioEpisodeAction}>
      <h2 className="host-radio-form-title">新建一期</h2>
      <div className="split">
        <label>期数<input name="episodeNumber" type="number" min={1} step={1} required defaultValue={nextEpisodeNumber}/></label>
        <label>本期主题<input name="title" maxLength={120} required placeholder="为这一期起个名字"/></label>
      </div>
      <span className="helper">先保存为草稿，再添加故事和收录的观众投稿。</span>
      <div className="form-actions"><button className="button primary" type="submit"><Plus aria-hidden="true"/> 创建这一期</button></div>
    </form>

    <div className="host-radio-section-heading"><h2>全部期数</h2><span className="helper">共 {episodes.length} 期</span></div>
    <div className="host-list">
      {episodes.map((episode) => <article className="panel host-radio-row" key={episode.id}>
        <div className="host-radio-row-main">
          <div className="card-top"><span className="category">第 {episode.episodeNumber} 期</span><span className={episode.publishedAt ? "published-pill" : "read-state"}>{episode.publishedAt ? "已发布" : "草稿"}</span></div>
          <h2><Link href={`/host/radio/${episode.id}`}>{episode.title}</Link></h2>
          <div className="record-meta"><span>更新于 {formatDate(episode.updatedAt)}</span></div>
        </div>
        <Link className="button small ghost" href={`/host/radio/${episode.id}`}>管理本期 <ArrowRight aria-hidden="true"/></Link>
      </article>)}
      {!episodes.length ? <div className="empty-state"><Radio aria-hidden="true"/><h3>电台的故事，从这里开始</h3><p>创建第一期，慢慢整理，再分享给大家。</p></div> : null}
    </div>
  </>;
}
