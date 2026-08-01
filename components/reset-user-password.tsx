"use client";

import { useActionState, useState } from "react";
import { KeyRound, X } from "lucide-react";
import { resetUserPasswordAction, type ResetPasswordState } from "@/app/actions";

const initialState: ResetPasswordState = {};

export function ResetUserPassword({ userId, username }: { userId: string; username: string }) {
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState(resetUserPasswordAction, initialState);
  return <div className="password-reset-control">
    {!armed ? <button className="button small ghost" type="button" onClick={() => setArmed(true)}><KeyRound aria-hidden="true"/>重置密码</button> : <form action={action} className="password-reset-confirm"><input name="userId" type="hidden" value={userId}/><input name="username" type="hidden" value={username}/><span>旧密码将立即失效</span><button className="button small danger" type="submit" disabled={pending}>{pending ? "生成中…" : "确认重置"}</button><button className="icon-button" type="button" aria-label="取消重置" onClick={() => setArmed(false)}><X aria-hidden="true"/></button></form>}
    {state.error ? <span className="password-reset-error" role="alert">{state.error}</span> : null}
    {state.oneTimePassword ? <div className="one-time-password" role="status"><span>{state.username} 的一次性密码（仅显示这一次）</span><code>{state.oneTimePassword}</code><small>发送给用户；登录一次后必须立即设置新密码。</small></div> : null}
  </div>;
}
