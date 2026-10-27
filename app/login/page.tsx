"use client";
import { useState, useEffect } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Mail,
  ShieldCheck,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import {
  authConfigured,
  getSupabase,
  authAvailability,
  type AuthAvailability,
} from "../../lib/supabase";
export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loggedIn, setLoggedIn] = useState(false),
    [availability, setAvailability] = useState<AuthAvailability | null>(null),
    [providerError, setProviderError] = useState(false),
    [check, setCheck] = useState(0),
    [confirmEmail, setConfirmEmail] = useState(false);
  useEffect(() => {
    const c = getSupabase();
    if (c) c.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const err = new URLSearchParams(location.search).get("error");
    if (err) setError("인증이 완료되지 않았어요. 다시 로그인해 주세요.");
  }, []);
  useEffect(() => {
    if (!authConfigured) return;
    let active = true;
    setProviderError(false);
    authAvailability()
      .then((value) => {
        if (active) setAvailability(value);
      })
      .catch(() => {
        if (active) setProviderError(true);
      });
    return () => {
      active = false;
    };
  }, [check]);
  const changeMode = (m: typeof mode) => {
    setMode(m);
    setError("");
    setNotice("");
    setConfirmEmail(false);
  };
  async function social(provider: "google" | "kakao" | "apple") {
    const client = getSupabase();
    if (!client || !availability?.[provider]) return;
    setBusy(true);
    setError("");
    try {
      const current = await authAvailability();
      setAvailability(current);
      if (!current[provider]) {
        setError(
          "이 로그인은 아직 연결 준비 중이에요. 이메일로 로그인해 주세요.",
        );
        setBusy(false);
        return;
      }
      const { error } = await client.auth.signInWithOAuth({
        provider: provider as Provider,
        options: { redirectTo: location.origin + "/auth/callback" },
      });
      if (error) throw error;
    } catch {
      setError(
        "소셜 로그인을 시작하지 못했어요. 이메일 로그인 또는 잠시 후 다시 시도해 주세요.",
      );
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const client = getSupabase();
    if (!client) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + "/auth/callback?recovery=1",
        });
        if (error) throw error;
        setNotice("가입된 이메일이라면 비밀번호 재설정 링크가 발송됩니다.");
      } else if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: location.origin + "/auth/callback",
          },
        });
        if (error) throw error;
        if (data.session) {
          location.assign("/");
          return;
        }
        setConfirmEmail(true);
        setNotice(
          "확인 메일을 보냈어요. 메일에서 인증한 뒤 이 화면에서 로그인해 주세요. 이미 가입했다면 로그인 또는 비밀번호 재설정을 이용하세요.",
        );
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        location.assign("/");
        return;
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === "invalid_credentials"
          ? "이메일 또는 비밀번호를 확인해 주세요."
          : code === "email_not_confirmed"
            ? "먼저 가입 확인 메일에서 이메일 인증을 완료해 주세요."
            : code === "over_email_send_rate_limit"
              ? "메일 요청이 많아요. 잠시 후 다시 시도해 주세요."
              : "요청을 처리하지 못했어요. 입력한 정보와 연결 상태를 확인해 주세요.",
      );
      if (code === "email_not_confirmed") setConfirmEmail(true);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    const client = getSupabase();
    if (!client || !email || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: location.origin + "/auth/callback" },
      });
      if (error) throw error;
      setNotice(
        "인증 메일을 다시 요청했어요. 받은 편지함과 스팸함을 확인해 주세요.",
      );
    } catch {
      setError("메일을 다시 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <a className="auth-back" href="/">
        <ArrowLeft size={17} /> 온핏으로 돌아가기
      </a>
      <div className="auth-shell">
        <section className="auth-story">
          <a className="brand" href="/">
            <span className="brand-mark">
              <Activity size={25} />
            </span>
            onfit<span className="brand-dot">.</span>
          </a>
          <span className="auth-eyebrow">YOUR RECORDS. YOUR PROGRESS.</span>
          <h1>
            나의 기록은 이어지고,
            <br />
            나의 변화는 쌓이니까.
          </h1>
          <p>
            오늘 남긴 운동과 식사, 다음 기기에서도 그대로.
            <br />
            계정에 로그인하고 나의 기록을 이어가세요.
          </p>
          <div className="auth-benefits">
            {[
              "세트별 중량·횟수·휴식 기록 보관",
              "같은 계정으로 다른 기기에서 불러오기",
              "게스트 기록도 로그인 후 가져오기",
            ].map((t) => (
              <div key={t}>
                <CheckCircle2 size={18} />
                {t}
              </div>
            ))}
          </div>
          <div className="auth-orb">✦</div>
        </section>
        <section className="auth-form-section">
          <div className="eyebrow">WELCOME TO ONFIT</div>
          <h2>
            {mode === "signup"
              ? "온핏과 첫걸음을 시작해요"
              : mode === "reset"
                ? "비밀번호를 잊으셨나요?"
                : "다시 만나서 반가워요"}
          </h2>
          <p className="auth-subtitle">
            {mode === "signup"
              ? "가입 후 이메일을 인증하면 계정에 기록을 보관할 수 있어요."
              : mode === "reset"
                ? "가입한 이메일로 재설정 링크를 보내드릴게요."
                : "로그인하면 저장된 운동·식사·인바디 기록을 불러와요."}
          </p>
          {!authConfigured && (
            <div className="auth-notice">
              <ShieldCheck size={20} />
              <div>
                <b>로그인 서비스 연결 준비 중</b>
                <p>
                  인증 서버 설정이 필요해요. 연결 전에는 게스트로 기록할 수
                  있습니다.
                </p>
                <a href="/">
                  게스트로 둘러보기 <ArrowRight size={13} />
                </a>
              </div>
            </div>
          )}
          {loggedIn ? (
            <div className="auth-notice">
              <CheckCircle2 />
              <div>
                <b>이미 로그인되어 있어요.</b>
                <p>현재 계정의 기록을 이어서 확인할 수 있어요.</p>
                <a href="/">
                  내 기록으로 돌아가기 <ArrowRight size={13} />
                </a>
              </div>
            </div>
          ) : (
            <>
              {mode !== "reset" && (
                <>
                  <div className="social-buttons">
                    {(
                      [
                        { id: "google", name: "Google" },
                        { id: "kakao", name: "카카오" },
                        { id: "apple", name: "Apple" },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        disabled={
                          !authConfigured || busy || !availability?.[p.id]
                        }
                        className={"social " + p.id}
                        onClick={() => social(p.id)}
                      >
                        <span
                          aria-hidden="true"
                          className={
                            p.id === "google"
                              ? "google-symbol"
                              : p.id === "kakao"
                                ? "kakao-symbol"
                                : "apple-symbol"
                          }
                        >
                          {p.id === "google" ? (
                            "G"
                          ) : p.id === "apple" ? (
                            <svg
                              width="19"
                              height="21"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M17.1 12.4c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.4-.2-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 3-.7 1.4 0 1.8.7 3 .7 1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.3-.9-2.3-3.9zM14.8 6.1c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.2 1.8-1 2.8 1 .1 2-.5 2.7-1.2z" />
                            </svg>
                          ) : (
                            ""
                          )}
                        </span>
                        {p.name}로 계속하기
                        {authConfigured &&
                          availability &&
                          !availability[p.id] && (
                            <small className="social-status">준비 중</small>
                          )}
                      </button>
                    ))}
                  </div>
                  {authConfigured &&
                    availability &&
                    (!availability.google ||
                      !availability.kakao ||
                      !availability.apple) && (
                      <p className="provider-hint">
                        준비 중인 소셜 로그인은 이용할 수 없어요. 이메일
                        가입·로그인은 아래에서 사용할 수 있습니다.
                      </p>
                    )}
                  {providerError && (
                    <p className="provider-hint">
                      소셜 로그인 연결 상태를 확인하지 못했어요.{" "}
                      <button
                        type="button"
                        onClick={() => setCheck((n) => n + 1)}
                      >
                        다시 확인
                      </button>
                    </p>
                  )}
                  <div className="auth-divider">
                    <span />
                    또는 이메일로 계속하기
                    <span />
                  </div>
                </>
              )}
              <form onSubmit={submit}>
                <fieldset
                  disabled={
                    !authConfigured || busy || availability?.email === false
                  }
                >
                  {mode === "signup" && (
                    <label>
                      이름 또는 닉네임
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={40}
                        autoComplete="nickname"
                        placeholder="어떻게 불러드릴까요?"
                      />
                    </label>
                  )}
                  <label>
                    이메일
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      maxLength={254}
                    />
                  </label>
                  {mode !== "reset" && (
                    <label>
                      비밀번호
                      <input
                        type="password"
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete={
                          mode === "signup"
                            ? "new-password"
                            : "current-password"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="8자 이상 입력해 주세요"
                      />
                    </label>
                  )}
                  {mode === "signin" && (
                    <button
                      type="button"
                      className="forgot-button"
                      onClick={() => changeMode("reset")}
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  )}
                  <button
                    className="primary auth-submit"
                    type="submit"
                    disabled={
                      mode === "signup" && availability?.signup === false
                    }
                  >
                    {busy ? (
                      <LoaderCircle size={18} className="spin" />
                    ) : (
                      <Mail size={17} />
                    )}{" "}
                    {mode === "signup"
                      ? "이메일로 가입하기"
                      : mode === "reset"
                        ? "재설정 메일 보내기"
                        : "이메일로 로그인"}
                  </button>
                </fieldset>
              </form>
              {mode === "signup" && availability?.signup === false && (
                <p className="provider-hint">
                  현재 새 회원 가입이 중지되어 있어요.
                </p>
              )}
              <div className="auth-switch">
                {mode === "signin"
                  ? "아직 계정이 없으신가요?"
                  : "이미 계정이 있으신가요?"}
                <button
                  onClick={() =>
                    changeMode(mode === "signin" ? "signup" : "signin")
                  }
                >
                  {mode === "signin" ? "직접 가입하기" : "로그인하기"}
                </button>
              </div>
            </>
          )}
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="auth-success" role="status">
              {notice}
            </div>
          )}
          {confirmEmail && (
            <button
              className="email-resend"
              disabled={busy || !email}
              onClick={resend}
            >
              인증 메일 다시 보내기
            </button>
          )}
          <p className="auth-privacy">
            <ShieldCheck size={14} /> 기록은 로그인한 계정별로 분리해
            보관합니다.
            <br />
            로그인 후 기존 게스트 기록을 가져올 수 있어요.
          </p>
        </section>
      </div>
    </div>
  );
}
