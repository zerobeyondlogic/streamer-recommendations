import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "验证 B 站 UID" };
export default async function VerifyBilibiliPage({ searchParams }: { searchParams: Promise<{ uid?: string; code?: string }> }) {
  const { uid = "", code = "" } = await searchParams;
  const profileUrl = /^[1-9]\d{0,19}$/.test(uid) ? `https://space.bilibili.com/${uid}` : "https://space.bilibili.com/";
  return <div className="form-page"><header className="form-header"><span className="eyebrow">最后一步</span><h1>证明这个 UID 属于你</h1><p>这是不读取登录信息的安全核验方式。完成后由神绮爱在后台确认。</p></header><section className="panel stack verify-steps"><ol><li><b>1</b><span>打开你的 <a className="bv-link" href={profileUrl} target="_blank" rel="noopener noreferrer">B 站个人空间</a>。</span></li><li><b>2</b><span>暂时把个人签名改为下面这段验证码：</span></li></ol><code className="verification-code">{code || "验证码仅在注册完成后显示"}</code><ol start={3}><li><b>3</b><span>保留签名，等待神绮爱核验；核验后即可改回原签名并登录投稿。</span></li></ol><div className="privacy-note"><strong>为什么不用 Cookie？</strong><p>本站与 bilibili.com 不同源，普通网页无法也不应该读取 B 站登录 Cookie。主页签名挑战只使用你主动公开的短期验证码。</p></div><Link className="button primary" href="/login">已设置，稍后去登录</Link></section></div>;
}
