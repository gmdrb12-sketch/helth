"use client";
import { useEffect, useRef, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabase } from "../../../lib/supabase";
import { ShieldCheck } from "lucide-react";
export default function Callback() {
  const started = useRef(false);
  const [error, setError] = useState(""),
    [recover, setRecover] = useState(false),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function complete() {
      const client = getSupabase();
      if (!client) {
        setError("인증 서비스가 연결되지 않았습니다.");
        return;
      }
      const params = new URLSearchParams(location.search),
        hash = new URLSearchParams(location.hash.slice(1));
      if (params.get("error") || hash.get("error")) {
        setError(
          "로그인이 취소되었거나 인증 링크가 만료되었어요. 다시 로그인해 주세요.",
        );
        return;
      }
      let authError: unknown = null;
      const code = params.get("code"),
        tokenHash = params.get("token_hash"),
        type = params.get("type");
      if (code) {
        const result = await client.auth.exchangeCodeForSession(code);
        authError = result.error;
      } else if (
        tokenHash &&
        type &&
        [
          "signup",
          "email",
          "magiclink",
          "recovery",
          "invite",
          "email_change",
        ].includes(type)
      ) {
        const result = await client.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        });
        authError = result.error;
      } else if (hash.get("access_token") && hash.get("refresh_token")) {
        const result = await client.auth.setSession({
          access_token: hash.get("access_token")!,
          refresh_token: hash.get("refresh_token")!,
        });
        authError = result.error;
      } else {
        const { data } = await client.auth.getSession();
        if (!data.session) {
          setError(
            "인증 정보를 확인할 수 없어요. 이메일 인증을 마쳤다면 로그인 화면에서 이메일과 비밀번호로 로그인해 주세요.",
          );
          return;
        }
      }
      if (authError) {
        setError(
          "인증 링크가 만료되었거나 다른 브라우저에서 열렸어요. 이메일 인증을 마쳤다면 이메일과 비밀번호로 로그인해 주세요.",
        );
        return;
      }
      history.replaceState({}, "", location.pathname);
      if (
        params.get("recovery") === "1" ||
        type === "recovery" ||
        hash.get("type") === "recovery"
      )
        setRecover(true);
      else location.replace("/");
    }
    complete().catch(() =>
      setError("연결에 실패했습니다. 로그인 화면에서 다시 시도해 주세요."),
    );
  }, []);
  return (
    <div className="callback-page">
      <section className="card">
        <ShieldCheck size={38} />
        <h1>
          {recover
            ? "새 비밀번호 설정"
            : error
              ? "인증을 확인해 주세요"
              : "로그인을 완료하고 있어요"}
        </h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <a className="primary" href="/login">
              이메일로 로그인하기
            </a>
          </>
        ) : recover ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const client = getSupabase();
              if (!client) return;
              try {
                const { error } = await client.auth.updateUser({ password });
                if (error) throw error;
                location.replace("/");
              } catch {
                setError(
                  "비밀번호를 변경하지 못했어요. 새 재설정 링크를 요청해 주세요.",
                );
                setBusy(false);
              }
            }}
          >
            <label>
              새 비밀번호
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy}>
              비밀번호 저장
            </button>
          </form>
        ) : (
          <p>안전하게 계정과 기록을 연결하는 중입니다.</p>
        )}
      </section>
    </div>
  );
}
