import type { Metadata } from "next";
import Link from "next/link";
import { deleteOwnSubmissionAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { BvText } from "@/components/bv-text";
import { requireUser } from "@/lib/auth";
import { categoryLabels, contentStatusLabel } from "@/lib/config";
import { getMySubmissions } from "@/lib/data";
import { formatDate } from "@/lib/view";
export const metadata: Metadata = { title: "我的投稿" };
export default async function MySubmissionsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await requireUser(); const [items, params] = await Promise.all([getMySubmissions(user.id), searchParams]);
  return <div className="form-page wide"><header className="form-header"><span className="eyebrow">个人投稿记录</span><h1>我的投稿</h1><p>查看神绮爱是否已经打开、作品体验到哪里，以及最新感想和评分。</p></header><Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice><div className="record-list">{items.map((item) => <article className="panel record-card" key={item.id}><div className="record-main"><div className="card-top"><span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span>{item.anonymousPublic ? <span className="pin">匿名展示</span> : null}{item.score ? <span className="score compact-score"><b>{item.score}</b><small>/10</small></span> : null}{item.unread ? <span className="unread-pill">有新回复</span> : null}</div><h2>{item.title}</h2><div className="record-meta"><span>投稿于 {formatDate(item.createdAt)}</span><span>{item.hostReadAt ? "投稿已查看" : "投稿未查看"}</span><span>{item.publishedAt ? "已公开" : "未公开"}</span><span>作品{contentStatusLabel(item.category, item.contentStatus)}</span>{item.deletedAt ? <span className="danger-text">已删除</span> : null}</div>{item.reply ? <div className="host-reply"><strong>神绮爱感想</strong><p><BvText>{item.reply}</BvText></p></div> : null}</div><div className="record-actions">{!item.hostReadAt && !item.deletedAt ? <form action={deleteOwnSubmissionAction}><input type="hidden" name="submissionId" value={item.id}/><button className="button small danger" type="submit">撤回投稿</button></form> : null}{item.publishedAt && !item.deletedAt ? <Link className="button small ghost" href={`/?submission=${item.id}#${item.id}`}>查看公开卡片</Link> : null}</div></article>)}</div>{items.length===0?<div className="empty-state"><span>✉</span><h3>还没有投稿</h3><p>把最近让你着迷的作品推荐给神绮爱吧。</p><Link className="button primary" href="/submit">去投稿</Link></div>:null}</div>;
}
