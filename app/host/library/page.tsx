import type { Metadata } from "next";
import Link from "next/link";
import { Cloud } from "lucide-react";
import { HostCard } from "@/components/host-card";
import { Notice } from "@/components/notice";
import { StyledSelect } from "@/components/styled-select";
import { categories, categoryLabels, contentStatuses, submissionKindLabels, submissionKinds, type SubmissionKind } from "@/lib/config";
import { getHostSubmissions } from "@/lib/data";
export const metadata: Metadata = { title: "公开推荐库" };
export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const p=await searchParams; const kind = submissionKinds.includes(p.kind as SubmissionKind) ? p.kind as SubmissionKind : undefined; const workCategories=categories.filter((item)=>item!=="food"&&item!=="wish"); const items=await getHostSubmissions({view:"library",kind,category:p.category,status:p.status,q:p.q,pinned:p.pinned==="1"});
  return <><header className="host-heading"><div><span className="eyebrow">Public library</span><h1>公开内容库</h1><p>管理推荐单、美食家与许愿箱。</p></div><Link className="button primary" href="/host/recommend">写原创内容</Link></header><Notice>{p.error}</Notice><Notice type="success">{p.success}</Notice><form className="filters host-filters"><label>搜索<input name="q" defaultValue={p.q} placeholder="名称或标题…" /></label><StyledSelect name="kind" label="栏目" defaultValue={kind??""} options={[{value:"",label:"全部栏目"},...submissionKinds.map((item)=>({value:item,label:submissionKindLabels[item]}))]}/><StyledSelect name="category" label="作品分类" defaultValue={p.category??""} options={[{value:"",label:"全部"},...workCategories.map((item)=>({value:item,label:categoryLabels[item]}))]}/><StyledSelect name="status" label="状态" defaultValue={p.status??""} options={[{value:"",label:"全部"},...contentStatuses.map((status)=>({value:status,label:status==="pending"?"待处理":status==="in_progress"?"进行中":status==="completed"?"已完成":"已放弃"}))]}/><label className="checkbox compact"><input name="pinned" value="1" type="checkbox" defaultChecked={p.pinned==="1"}/><span>只看置顶</span></label><button className="button small primary">筛选</button></form><div className="host-list">{items.map(item=><HostCard item={item} returnTo="/host/library" key={item.id}/>)}</div>{!items.length?<div className="empty-state"><Cloud aria-hidden="true"/><h3>没有符合条件的内容</h3></div>:null}</>;
}
