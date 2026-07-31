import type { Metadata } from "next";
import { submitAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { categoryLabels, categories } from "@/lib/config";
import { requireUser } from "@/lib/auth";
export const metadata: Metadata = { title: "推荐作品" };
export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser(); const { error } = await searchParams;
  return <div className="form-page"><header className="form-header"><span className="eyebrow">投递一份喜欢</span><h1>你想安利什么？</h1><p>第一版只支持纯文本。投稿会先进入神绮爱收件箱，神绮爱首次打开后自动公开。</p></header><form className="panel stack" action={submitAction}><Notice>{error}</Notice><label>分类<select name="category" required defaultValue=""><option value="" disabled>选择作品分类</option>{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></label><label>作品名称<input name="title" maxLength={100} placeholder="例如：一本让你舍不得合上的书" required /><span className="helper">最多 100 字。</span></label><label>推荐介绍（选填）<textarea name="description" maxLength={1000} placeholder="为什么推荐它？哪一点最打动你？" /><span className="helper">最多 1000 字，不支持 HTML 或 Markdown。</span></label><label>相关链接（选填）<input name="externalUrl" type="url" inputMode="url" placeholder="https://…" /><span className="helper">只允许 http/https 链接，公开后会在新窗口打开。</span></label><label className="checkbox"><input name="anonymousPublic" type="checkbox" /><span>不在公开首页展示我的用户名<span className="helper">神绮爱仍能看到你的身份，你也能在“我的投稿”中查看。</span></span></label><button className="button primary" type="submit">送进神绮爱收件箱 ✦</button></form></div>;
}
