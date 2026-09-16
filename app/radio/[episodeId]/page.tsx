import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen } from "lucide-react";
import { RadioBreadcrumbs } from "@/components/radio-breadcrumbs";
import { getPublicRadioEpisode } from "@/lib/radio";

export const metadata: Metadata = { title: "本期目录 · 小羊老师电台" };
export const dynamic = "force-dynamic";

export default async function RadioEpisodePage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const result = await getPublicRadioEpisode(episodeId);
  if (!result) notFound();
  const { episode, entries } = result;

  return <div className="page-shell radio-page">
    <RadioBreadcrumbs items={[{ label: "小羊老师电台", href: "/radio" }, { label: `第 ${episode.episodeNumber} 期` }]}/>
    <header className="collection-hero radio-hero radio-episode-hero">
      <span className="collection-hero-mark"><BookOpen aria-hidden="true"/></span>
      <div><span className="eyebrow">小羊老师电台 · 第 {episode.episodeNumber} 期</span><h1>{episode.title}</h1><p>本期目录</p></div>
    </header>
    <section className="radio-archive" aria-label="本期目录">
      {entries.length ? <ol className="radio-list">{entries.map((entry, index) => <li key={entry.id}>
        <Link className="panel radio-list-link radio-directory-link" href={`/radio/${episode.id}/${entry.id}`}>
          <span className="radio-item-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div className="radio-list-title">{entry.kind === "submission" ? <span className="radio-kind">观众投稿</span> : null}<h2>{entry.title}</h2></div>
          <ArrowUpRight className="radio-list-arrow" aria-hidden="true"/>
        </Link>
      </li>)}</ol> : <div className="empty-state"><BookOpen aria-hidden="true"/><h2>本期故事正在整理</h2><p>稍后再来看看吧。</p></div>}
      <div className="radio-back"><Link className="button ghost" href="/radio"><ArrowLeft aria-hidden="true"/> 返回每期主题</Link></div>
    </section>
  </div>;
}
