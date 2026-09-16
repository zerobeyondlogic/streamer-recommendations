import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Notice } from "@/components/notice";
import { RadioEntryEditor } from "@/components/radio-entry-editor";
import { requireHost } from "@/lib/auth";
import { getHostRadioEpisode } from "@/lib/radio";

export const metadata: Metadata = { title: "编辑电台内容" };

export default async function HostRadioEntryPage({ params }: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  await requireHost();
  const { id, entryId } = await params;
  const data = await getHostRadioEpisode(id);
  if (!data) notFound();
  const { episode, entries } = data;
  const isNew = entryId === "new";
  const entry = isNew ? undefined : entries.find((item) => item.id === entryId);
  if (!isNew && !entry) notFound();
  const nextPosition = entries.reduce((maximum, item) => Math.max(maximum, item.position), 0) + 1;

  return <>
    <div className="toolbar"><Link className="button small ghost" href={`/host/radio/${episode.id}`}><ArrowLeft aria-hidden="true"/> 返回本期目录</Link></div>
    <header className="host-heading host-radio-heading"><div><span className="eyebrow">小羊电台 · 第 {episode.episodeNumber} 期</span><h1>{isNew ? "添加一篇内容" : "编辑内容"}</h1><p>{episode.title}</p></div></header>
    {episode.publishedAt ? <Notice type="info">本期已发布，保存后内容会同步更新到电台。</Notice> : null}
    <RadioEntryEditor episodeId={episode.id} entry={entry} nextPosition={nextPosition}/>
  </>;
}
