import type { Metadata } from "next";
import { Check } from "lucide-react";
import { HostCard } from "@/components/host-card";
import { Notice } from "@/components/notice";
import { StyledSelect } from "@/components/styled-select";
import { categories, categoryLabels, submissionKindLabels, submissionKinds, type SubmissionKind } from "@/lib/config";
import { getHostSubmissions } from "@/lib/data";
export const metadata: Metadata = { title: "投稿收件箱" };
export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const p=await searchParams; const kind = submissionKinds.includes(p.kind as SubmissionKind) ? p.kind as SubmissionKind : undefined; const workCategories = categories.filter((item)=>item!=="food"&&item!=="wish"); const items=await getHostSubmissions({view:"inbox",kind,read:p.read,category:p.category,q:p.q});
  return <><header className="host-heading"><div><span className="eyebrow">Inbox</span><h1>投稿收件箱</h1><p>审核后公开到对应栏目。</p></div></header><Notice>{p.error}</Notice><Notice type="success">{p.success}</Notice><form className="filters host-filters"><label>搜索<input name="q" defaultValue={p.q} placeholder="名称或标题…" /></label><StyledSelect name="kind" label="栏目" defaultValue={kind??""} options={[{value:"",label:"全部栏目"},...submissionKinds.map((item)=>({value:item,label:submissionKindLabels[item]}))]}/><StyledSelect name="read" label="查看状态" defaultValue={p.read??""} options={[{value:"",label:"全部"},{value:"unread",label:"未查看"},{value:"read",label:"已查看"}]}/><StyledSelect name="category" label="作品分类" defaultValue={p.category??""} options={[{value:"",label:"全部分类"},...workCategories.map((item)=>({value:item,label:categoryLabels[item]}))]}/><button className="button small primary">筛选</button></form><div className="host-list">{items.map(item=><HostCard item={item} returnTo="/host/inbox" key={item.id}/>)}</div>{!items.length?<div className="empty-state"><Check aria-hidden="true"/><h3>暂无投稿</h3></div>:null}</>;
}
