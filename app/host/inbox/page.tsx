import type { Metadata } from "next";
import { HostCard } from "@/components/host-card";
import { Notice } from "@/components/notice";
import { StyledSelect } from "@/components/styled-select";
import { categories, categoryLabels } from "@/lib/config";
import { getHostSubmissions } from "@/lib/data";
export const metadata: Metadata = { title: "投稿收件箱" };
export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const p=await searchParams; const items=await getHostSubmissions({view:"inbox",read:p.read,category:p.category,q:p.q});
  return <><header className="host-heading"><div><span className="eyebrow">Inbox</span><h1>投稿收件箱</h1><p>列表展示完整介绍预览。删除不会触发“已查看”，打开详情才会公开。</p></div></header><Notice>{p.error}</Notice><Notice type="success">{p.success}</Notice><form className="filters host-filters"><label>搜索<input name="q" defaultValue={p.q} placeholder="作品名称…" /></label><StyledSelect name="read" label="查看状态" defaultValue={p.read??""} options={[{value:"",label:"全部"},{value:"unread",label:"未查看"},{value:"read",label:"已查看"}]}/><StyledSelect name="category" label="分类" defaultValue={p.category??""} options={[{value:"",label:"全部分类"},...categories.map((item)=>({value:item,label:categoryLabels[item]}))]}/><button className="button small primary">筛选</button></form><div className="host-list">{items.map(item=><HostCard item={item} returnTo="/host/inbox" key={item.id}/>)}</div>{!items.length?<div className="empty-state"><span>✓</span><h3>收件箱清空啦</h3><p>暂时没有符合条件的投稿。</p></div>:null}</>;
}
