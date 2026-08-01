import type { Metadata } from "next";
import { submitAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { StyledSelect } from "@/components/styled-select";
import { categoryLabels, categories } from "@/lib/config";
import { requireUser } from "@/lib/auth";
export const metadata: Metadata = { title: "推荐作品" };
export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser(); const { error } = await searchParams;
  return <div className="form-page"><header className="form-header"><span className="eyebrow">推荐作品</span><h1>你想安利什么？</h1><p>神绮爱首次打开后公开。</p></header><form className="panel stack" action={submitAction}><Notice>{error}</Notice><StyledSelect name="category" label="分类" required defaultValue="" options={[{value:"",label:"选择作品分类",disabled:true},...categories.map((item)=>({value:item,label:categoryLabels[item]}))]}/><label>作品名称<input name="title" maxLength={100} placeholder="作品名称" required /></label><label>推荐理由（选填）<textarea name="description" maxLength={1000} placeholder="为什么推荐它？" /><span className="helper">最多 1000 字。</span></label><label>相关链接（选填）<input name="externalUrl" type="url" inputMode="url" placeholder="https://…" /><span className="helper">仅支持 http/https。</span></label><label className="checkbox"><input name="anonymousPublic" type="checkbox" /><span>公开时隐藏我的用户名<span className="helper">神绮爱仍可见。</span></span></label><button className="button primary" type="submit">提交推荐</button></form></div>;
}
