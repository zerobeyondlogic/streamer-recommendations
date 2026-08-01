import type { Metadata } from "next";
import { createHostRecommendationAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { StyledSelect } from "@/components/styled-select";
import { categories, categoryLabels } from "@/lib/config";
export const metadata: Metadata = { title: "撰写原创推荐" };
export default async function HostRecommendPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <><header className="host-heading"><div><span className="eyebrow">Host original</span><h1>写原创推荐</h1><p>发布后自动归类为已完成。</p></div></header><Notice>{error}</Notice><form className="panel stack host-recommend-form" action={createHostRecommendationAction}><StyledSelect name="category" label="分类" required defaultValue="" options={[{value:"",label:"选择分类",disabled:true},...categories.map((category)=>({value:category,label:categoryLabels[category]}))]}/><label>作品名称<input name="title" required maxLength={100} placeholder="作品名称" /></label><label>推荐理由<textarea name="description" maxLength={1000} placeholder="为什么值得推荐？" /></label><label>体验感想<textarea name="experience" maxLength={4000} placeholder="你的真实感想" /></label><div className="split"><StyledSelect name="score" label="评分（10 分制）" defaultValue="" helper="可稍后修改。" options={[{value:"",label:"暂不评分"},...[10,9,8,7,6,5,4,3,2,1].map((score)=>({value:String(score),label:`${score} / 10`}))]}/><label>相关链接（选填）<input name="externalUrl" type="url" placeholder="https://…" /></label></div><label className="checkbox"><input name="pin" type="checkbox" /><span>直接置顶<span className="helper">所有排序均优先。</span></span></label><label>置顶推荐语（选填）<textarea name="pinNote" maxLength={300} /></label><button className="button primary" type="submit">发布推荐</button></form></>;
}
