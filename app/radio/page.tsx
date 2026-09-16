import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import { getPublicRadioEpisodes } from "@/lib/radio";

export const metadata: Metadata = { title: "小羊老师电台", description: "把电台里的故事，留在这里慢慢读。" };
export const dynamic = "force-dynamic";

export default async function RadioPage() {
  const episodes = await getPublicRadioEpisodes();

  return <div className="page-shell radio-page">
    <header className="collection-hero radio-hero">
      <span className="collection-hero-mark"><Radio aria-hidden="true"/></span>
      <div><span className="eyebrow">Xiaoyang Radio</span><h1>小羊老师电台</h1><p>把电台里的故事，留在这里慢慢读。</p></div>
    </header>
    <section className="radio-archive" aria-label="每期主题">
      {episodes.length ? <ol className="radio-list">{episodes.map((episode) => <li key={episode.id}>
        <Link className="panel radio-list-link" href={`/radio/${episode.id}`}>
          <span className="radio-episode-number">第 {episode.episodeNumber} 期</span>
          <h2>{episode.title}</h2>
          <ArrowUpRight className="radio-list-arrow" aria-hidden="true"/>
        </Link>
      </li>)}</ol> : <div className="empty-state"><Radio aria-hidden="true"/><h2>故事还在路上</h2><p>等小羊老师整理好，我们就在这里见。</p></div>}
    </section>
  </div>;
}
