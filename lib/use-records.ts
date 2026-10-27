"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { empty, isData, type Data } from "./records";
import {
  acknowledgePending,
  readPending,
  writePending,
} from "./pending-records";
export function useRecords() {
  const [data, setData] = useState<Data>(empty),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState("저장 상태 확인 중…"),
    [syncError, setSyncError] = useState(false),
    [reload, setReload] = useState(0),
    [writeRetry, setWriteRetry] = useState(0);
  const generation = useRef(0),
    saved = useRef(""),
    queue = useRef(Promise.resolve()),
    canSync = useRef(false),
    revision = useRef(0),
    current = useRef(data),
    preferCloud = useRef<string | null>(null);
  current.current = data;
  useEffect(() => {
    const client = getSupabase();
    let disposed = false;
    let lastId: string | undefined;
    async function load(nextUser: User | null) {
      if (disposed || lastId === (nextUser?.id || "guest")) return;
      lastId = nextUser?.id || "guest";
      const version = ++generation.current;
      canSync.current = false;
      setReady(false);
      setUser(nextUser);
      setData(empty);
      saved.current = "";
      setSyncError(false);
      if (!nextUser) {
        let guest = empty;
        let problem = false;
        try {
          const raw = localStorage.getItem("onfit-data");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (isData(parsed)) guest = parsed;
            else problem = true;
          }
        } catch {
          problem = true;
        }
        if (disposed || version !== generation.current) return;
        setData(guest);
        saved.current = JSON.stringify(guest);
        setReady(true);
        setSyncError(problem);
        setStatus(
          problem
            ? "브라우저 기록을 읽지 못했어요. 백업 파일을 확인해 주세요."
            : "게스트 모드 · 이 브라우저에 저장 · 로그인하면 계정에 보관할 수 있어요",
        );
        return;
      }
      setStatus("계정 기록을 불러오는 중…");
      const pending =
        preferCloud.current === nextUser.id ? null : readPending(nextUser.id);
      try {
        const { data: row, error } = await client!
          .from("wellness_records")
          .select("payload,revision")
          .eq("user_id", nextUser.id)
          .maybeSingle();
        if (disposed || version !== generation.current) return;
        if (error || (row && !isData(row.payload))) throw Error("cloud-read");
        revision.current = Number(row?.revision || 0);
        const server: Data = row?.payload || empty;
        if (preferCloud.current === nextUser.id) {
          localStorage.removeItem(`onfit-pending-records:${nextUser.id}`);
          preferCloud.current = null;
        }
        const serialized = JSON.stringify(server);
        saved.current = serialized;
        if (pending && JSON.stringify(pending.data) !== serialized) {
          setData(pending.data);
          setReady(true);
          if (pending.revision !== revision.current) {
            revision.current = pending.revision;
            setStatus(
              "다른 기기에서 수정된 기록이 있어요. 미저장 기록을 백업한 뒤 새로고침해 주세요.",
            );
            setSyncError(true);
            return;
          }
          canSync.current = true;
          setStatus(
            "이전에 저장하지 못한 기록을 복원했어요. 클라우드에 다시 저장합니다.",
          );
        } else {
          if (pending)
            acknowledgePending(nextUser.id, serialized, revision.current);
          setData(server);
          canSync.current = true;
          setReady(true);
          setStatus("계정 기록 불러옴 · " + (nextUser.email || "로그인 계정"));
        }
      } catch {
        if (disposed || version !== generation.current) return;
        if (pending) {
          revision.current = pending.revision;
          setData(pending.data);
          setReady(true);
          setStatus(
            "미저장 기록을 이 브라우저에서 복원했어요. 연결 후 다시 시도해 주세요.",
          );
        } else
          setStatus(
            "계정 기록을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
          );
        setSyncError(true);
      }
    }
    if (!client) {
      void load(null);
      return () => {
        disposed = true;
        generation.current++;
      };
    }
    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        setTimeout(() => {
          void load(session?.user || null);
        }, 0);
      },
    );
    client.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (disposed) return;
        if (error) {
          setStatus("로그인 상태를 확인할 수 없어요. 다시 로그인해 주세요.");
          setSyncError(true);
          return;
        }
        void load(session?.user || null);
      })
      .catch(() => {
        if (!disposed) {
          setSyncError(true);
          setStatus("로그인 서버에 연결할 수 없어요. 다시 시도해 주세요.");
        }
      });
    return () => {
      disposed = true;
      generation.current++;
      listener.subscription.unsubscribe();
    };
  }, [reload]);
  useEffect(() => {
    if (!ready) return;
    const serialized = JSON.stringify(data);
    if (serialized === saved.current) return;
    if (!user) {
      try {
        localStorage.setItem("onfit-data", serialized);
        saved.current = serialized;
        setStatus("게스트 모드 · 이 브라우저에 저장됨");
        setSyncError(false);
      } catch {
        setStatus("브라우저 저장 실패 · 백업 파일을 내려받아 주세요.");
        setSyncError(true);
      }
      return;
    }
    let durable = true;
    try {
      writePending(user.id, data, revision.current);
    } catch {
      durable = false;
      setStatus(
        "임시 저장 공간이 부족해요. 저장 완료 전에는 창을 닫지 마세요.",
      );
      setSyncError(true);
    }
    if (!canSync.current) return;
    const version = generation.current;
    const client = getSupabase();
    if (!client) return;
    setStatus("계정에 기록 저장 중…");
    queue.current = queue.current
      .then(async () => {
        if (generation.current !== version || !canSync.current) return;
        setStatus("계정에 기록 저장 중…");
        const { data: nextRevision, error } = await client.rpc(
          "save_wellness_records",
          { new_payload: data, expected_revision: revision.current },
        );
        if (generation.current !== version) return;
        if (error) {
          setSyncError(true);
          if (error.code === "40001") canSync.current = false;
          setStatus(
            error.code === "40001"
              ? "다른 기기에서 기록이 변경됐어요. 미저장 기록을 백업한 뒤 새로고침해 주세요."
              : durable
                ? "계정 저장 실패 · 기록은 임시 보관 중이에요. 다시 시도해 주세요."
                : "계정 저장 실패 · 백업 파일을 내려받고 이 창을 유지해 주세요.",
          );
          return;
        }
        revision.current = Number(nextRevision);
        saved.current = serialized;
        try {
          acknowledgePending(user.id, serialized, revision.current);
        } catch {}
        setSyncError(false);
        setStatus(
          JSON.stringify(current.current) === serialized
            ? "클라우드 저장 완료 · " + (user.email || "로그인 계정")
            : "새 기록 저장 중…",
        );
      })
      .catch(() => {
        if (generation.current === version) {
          setSyncError(true);
          setStatus(
            durable
              ? "네트워크 오류 · 기록은 임시 보관 중이에요. 다시 시도해 주세요."
              : "네트워크 오류 · 임시 저장도 실패했어요. 백업 파일을 내려받아 주세요.",
          );
        }
      });
  }, [data, user, ready, writeRetry]);
  const retrySync = useCallback(() => {
    if (!ready || (user && !canSync.current)) setReload((n) => n + 1);
    else setWriteRetry((n) => n + 1);
  }, [ready, user]);
  useEffect(() => {
    const online = () => retrySync();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [retrySync]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (ready && JSON.stringify(current.current) !== saved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [ready]);
  const replaceWithCloud = useCallback(() => {
    if (!user) return;
    preferCloud.current = user.id;
    setReload((n) => n + 1);
  }, [user]);
  return {
    data,
    setData,
    user,
    ready,
    status,
    syncError,
    retrySync,
    replaceWithCloud,
  };
}
