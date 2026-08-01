import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "验证 B 站 UID" };
export default async function VerifyBilibiliPage({ searchParams }: { searchParams: Promise<{ uid?: string; code?: string }> }) {
  const { uid = "", code = "" } = await searchParams;
  const profileUrl = /^[1-9]\d{0,19}$/.test(uid) ? `https://space.bilibili.com/${uid}` : "https://space.bilibili.com/";
  return <div className="form-page"><header className="form-header"><span className="eyebrow">最后一步</span><h1>验证 B 站 UID</h1><p>修改主页签名，等待神绮爱核验。</p></header><section className="panel stack verify-steps"><ol><li><b>1</b><span>打开 <a className="bv-link" href={profileUrl} target="_blank" rel="noopener noreferrer">B 站个人空间</a>。</span></li><li><b>2</b><span>把个人签名暂时改为：</span></li></ol><code className="verification-code">{code || "验证码仅在注册完成后显示"}</code><ol start={3}><li><b>3</b><span>核验后改回签名并登录。</span></li></ol><div className="privacy-note"><strong>隐私说明</strong><p>本站不读取 B 站 Cookie，只核对公开签名中的短期验证码。</p></div><Link className="button primary" href="/login">返回登录</Link></section></div>;
}
