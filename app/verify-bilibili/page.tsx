import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePendingBilibiliUidAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { getCurrentUser, getVerificationUser } from "@/lib/auth";

export const metadata: Metadata = { title: "验证 B 站 UID" };

export default async function VerifyBilibiliPage({ searchParams }: { searchParams: Promise<{ uid?: string; code?: string; error?: string; success?: string }> }) {
  const [params, user, currentUser] = await Promise.all([searchParams, getVerificationUser(), getCurrentUser()]);
  if (currentUser) redirect(currentUser.role === "host" ? "/host" : "/");
  const uid = user?.bilibiliUid ?? params.uid ?? "";
  const code = user?.bilibiliVerificationCode ?? params.code ?? "";
  const rejected = user?.status === "rejected";
  const profileUrl = /^[1-9]\d{0,19}$/.test(uid) ? `https://space.bilibili.com/${uid}` : "https://space.bilibili.com/";

  return <div className="form-page verify-bilibili-page">
    <header className="form-header"><span className="eyebrow">{rejected ? "需要修改" : "最后一步"}</span><h1>{rejected ? "更新 B 站 UID" : "验证 B 站 UID"}</h1><p>{rejected ? "按回信修改后，重新提交核验。" : "修改主页签名，等待神绮爱核验。"}</p></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    {rejected && user?.bilibiliRejectionMessage ? <section className="panel verification-reply"><strong>神绮爱的回信</strong><p>{user.bilibiliRejectionMessage}</p></section> : null}
    {user ? <form className="panel stack verification-uid-form" action={updatePendingBilibiliUidAction}>
      <label>{rejected ? "填写正确的 B 站 UID" : "需要更换 UID？"}<input name="bilibiliUid" defaultValue={uid} inputMode="numeric" pattern="[1-9][0-9]{0,19}" maxLength={20} required/><span className="helper">个人空间网址末尾的数字。提交后会生成新的验证码。</span></label>
      <button className={`button ${rejected ? "primary" : "ghost"}`} type="submit">{rejected ? "更新 UID 并重新提交" : "更新 UID"}</button>
    </form> : null}
    {!rejected && code ? <section className="panel stack verify-steps">
      <ol><li><b>1</b><span>打开 <a className="bv-link" href={profileUrl} target="_blank" rel="noopener noreferrer">B 站个人空间</a>。</span></li><li><b>2</b><span>把个人签名暂时改为：</span></li></ol>
      <code className="verification-code">{code}</code>
      <ol start={3}><li><b>3</b><span>等待神绮爱核验；通过后即可正常使用账号。</span></li></ol>
      <div className="privacy-note"><strong>隐私说明</strong><p>本站不读取 B 站 Cookie，只核对公开签名中的短期验证码。</p></div>
      <Link className="button primary" href={user ? "/verify-bilibili" : "/login"}>{user ? "刷新核验状态" : "返回登录"}</Link>
    </section> : null}
    {!user && !code ? <section className="panel stack"><p>请先使用注册账号登录，查看核验状态或管理员回信。</p><Link className="button primary" href="/login">前往登录</Link></section> : null}
  </div>;
}
