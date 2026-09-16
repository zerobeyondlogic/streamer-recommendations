import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, List } from "lucide-react";
import { BvText } from "@/components/bv-text";
import { RadioBreadcrumbs } from "@/components/radio-breadcrumbs";
import { getPublicRadioEntry } from "@/lib/radio";

export const metadata: Metadata = { title: "故事 · 小羊老师电台" };
export const dynamic = "force-dynamic";

export default async function RadioEntryPage({ params }: { params: Promise<{ episodeId: string; entryId: string }> }) {
  const { episodeId, entryId } = await params;
  const result = await getPublicRadioEntry(episodeId, entryId);
  if (!result) notFound();
  const { episode, entry, entries } = result;
  const index = entries.findIndex((item) => item.id === entry.id);
  const previous = entries[index - 1];
  const next = entries[index + 1];
  const directoryUrl = `/radio/${episode.id}`;

  return <div className="page-shell radio-page radio-reader-page">
    <RadioBreadcrumbs items={[{ label: "小羊老师电台", href: "/radio" }, { label: `第 ${episode.episodeNumber} 期 · ${episode.title}`, href: directoryUrl }, { label: entry.title }]}/>
    <article className="panel radio-reader">
      <header className="radio-reader-heading">
        <Link className="eyebrow" href={directoryUrl}>第 {episode.episodeNumber} 期 · {episode.title}</Link>
        {entry.kind === "submission" ? <span className="radio-kind">观众投稿</span> : null}
        <h1>{entry.title}</h1>
      </header>
      <div className="radio-prose"><BvText>{entry.content}</BvText></div>
      <footer className="radio-reader-footer"><Link className="button ghost" href={directoryUrl}><List aria-hidden="true"/> 返回本期目录</Link></footer>
    </article>
    {previous || next ? <nav className="radio-reading-nav" aria-label="切换本期故事">
      {previous ? <Link className="panel radio-adjacent" href={`${directoryUrl}/${previous.id}`} rel="prev"><span><ArrowLeft aria-hidden="true"/> 上一篇</span><strong>{previous.title}</strong></Link> : <span/>}
      {next ? <Link className="panel radio-adjacent radio-adjacent-next" href={`${directoryUrl}/${next.id}`} rel="next"><span>下一篇 <ArrowRight aria-hidden="true"/></span><strong>{next.title}</strong></Link> : null}
    </nav> : null}
  </div>;
}
