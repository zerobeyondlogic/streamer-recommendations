import type { Metadata } from "next";
import Link from "next/link";
import { HostCard } from "@/components/host-card";
import { Notice } from "@/components/notice";
import { categories, categoryLabels, contentStatuses } from "@/lib/config";
import { getHostSubmissions } from "@/lib/data";
export const metadata: Metadata = { title: "公开推荐库" };
export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const p=await searchParams; const items=await getHostSubmissions({view:"library",category:p.category,status:p.status,q:p.q,pinned:p.pinned==="1"});
  return <><header className="host-heading"><div><span className="eyebrow">Recommendation library</span><h1>公开推荐库</h1><p>统一管理观众投稿与神绮爱原创的状态、评分、感想和置顶。</p></div><Link className="button primary" href="/host/recommend">撰写原创推荐</Link></header><Notice>{p.error}</Notice><Notice type="success">{p.success}</Notice><form className="filters host-filters"><label>搜索<input name="q" defaultValue={p.q} placeholder="作品名称…" /></label><label>分类<select name="category" defaultValue={p.category??""}><option value="">全部</option>{categories.map(x=><option key={x} value={x}>{categoryLabels[x]}</option>)}</select></label><label>作品状态<select name="status" defaultValue={p.status??""}><option value="">全部</option>{contentStatuses.map(x=><option key={x} value={x}>{x==="pending"?"待体验":x==="in_progress"?"进行中":x==="completed"?"已完成":"已放弃"}</option>)}</select></label><label className="checkbox compact"><input name="pinned" value="1" type="checkbox" defaultChecked={p.pinned==="1"}/><span>只看置顶</span></label><button className="button small primary">筛选</button></form><div className="host-list">{items.map(item=><HostCard item={item} returnTo="/host/library" key={item.id}/>)}</div>{!items.length?<div className="empty-state"><span>☁︎</span><h3>没有符合条件的作品</h3><p>换个筛选条件试试。</p></div>:null}</>;
}
