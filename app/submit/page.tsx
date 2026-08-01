import type { Metadata } from "next";
import { submitAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { StyledSelect } from "@/components/styled-select";
import { categoryLabels, categories, submissionKinds, type SubmissionKind } from "@/lib/config";
import { requireUser } from "@/lib/auth";
export const metadata: Metadata = { title: "推荐作品" };
export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ error?: string; kind?: string }> }) {
  await requireUser(); const { error, kind: rawKind } = await searchParams;
  const kind: SubmissionKind = submissionKinds.includes(rawKind as SubmissionKind) ? rawKind as SubmissionKind : "work";
  const workCategories = categories.filter((item) => item !== "food" && item !== "wish");
  const config = kind === "food"
    ? { eyebrow: "美食家投稿", title: "推荐一份美食", description: "写下店铺、菜品和推荐理由。", name: "店铺 / 菜品名称", placeholder: "例如：店名 · 招牌菜", reason: "位置与推荐理由（选填）", reasonPlaceholder: "在哪座城市？什么值得点？", submit: "提交到美食家", category: "food" }
    : kind === "wish"
      ? { eyebrow: "许愿箱投稿", title: "想在直播里实现什么？", description: "通过审核后，愿望会公开供大家支持。", name: "愿望标题", placeholder: "例如：回读一段台词", reason: "愿望说明（选填）", reasonPlaceholder: "补充想看的内容或实现方式", submit: "投进许愿箱", category: "wish" }
      : { eyebrow: "推荐单投稿", title: "你想安利什么？", description: "神绮爱首次打开后公开。", name: "作品名称", placeholder: "作品名称", reason: "推荐理由（选填）", reasonPlaceholder: "为什么推荐它？", submit: "提交推荐", category: "" };
  return <div className="form-page"><header className="form-header"><span className="eyebrow">{config.eyebrow}</span><h1>{config.title}</h1><p>{config.description}</p></header><nav className="submission-kind-switch" aria-label="选择投稿栏目"><a className={kind === "work" ? "is-active" : ""} href="/submit">推荐单</a><a className={kind === "wish" ? "is-active" : ""} href="/submit?kind=wish">许愿箱</a><a className={kind === "food" ? "is-active" : ""} href="/submit?kind=food">美食家</a></nav><form className="panel stack" action={submitAction}><Notice>{error}</Notice>{kind === "work" ? <StyledSelect name="category" label="作品分类" required defaultValue="" options={[{value:"",label:"选择作品分类",disabled:true},...workCategories.map((item)=>({value:item,label:categoryLabels[item]}))]}/> : <input name="category" type="hidden" value={config.category}/>}<label>{config.name}<input name="title" maxLength={100} placeholder={config.placeholder} required /></label><label>{config.reason}<textarea name="description" maxLength={1000} placeholder={config.reasonPlaceholder}/><span className="helper">最多 1000 字。</span></label><label>相关链接（选填）<input name="externalUrl" type="url" inputMode="url" placeholder="https://…"/><span className="helper">仅支持 http/https。</span></label><label className="checkbox"><input name="anonymousPublic" type="checkbox"/><span>公开时隐藏我的用户名<span className="helper">神绮爱仍可见。</span></span></label><button className="button primary" type="submit">{config.submit}</button></form></div>;
}
