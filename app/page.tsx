"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Heart,
  LayoutDashboard,
  Leaf,
  Menu,
  MoreHorizontal,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Utensils,
  Wallet,
  X,
  Zap,
  Send,
  Download,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
} from "lucide-react";
import {
  empty,
  isData,
  workoutVolume,
  type Data,
  type Workout,
} from "../lib/records";
import { useRecords } from "../lib/use-records";
import AccountPanel from "../components/account-panel";
import WorkoutEditor from "../components/workout-editor";
import WorkoutJournal from "../components/workout-journal";
import { draftKey } from "../lib/workout";
import { mergeGuestRecords } from "../lib/pending-records";
const day = () => new Date().toLocaleDateString("en-CA");
const uid = () => crypto.randomUUID();
const menu = [
  { id: "workout", name: "운동일지", icon: Dumbbell },
  { id: "home", name: "건강 요약", icon: LayoutDashboard },
  { id: "analysis", name: "운동 분석", icon: BarChart3 },
  { id: "body", name: "인바디", icon: Activity },
  { id: "meal", name: "식사 기록", icon: Utensils },
  { id: "coach", name: "AI 코치", icon: Sparkles },
];
export default function Home() {
  const [tab, setTab] = useState("workout"),
    [modal, setModal] = useState(""),
    [toast, setToast] = useState(""),
    [period, setPeriod] = useState("week"),
    [key, setKey] = useState(""),
    [message, setMessage] = useState(""),
    [chat, setChat] = useState<{ role: string; text: string }[]>([]),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null),
    [hasDraft, setHasDraft] = useState(false),
    [workoutDate, setWorkoutDate] = useState(day()),
    [workoutInitial, setWorkoutInitial] = useState<
      { records: Workout[]; repeat: boolean } | undefined
    >(undefined);
  const [guest, setGuest] = useState<Data | null>(null);
  const {
    data,
    setData,
    user,
    ready,
    status,
    syncError,
    retrySync,
    replaceWithCloud,
  } = useRecords();
  useEffect(() => {
    setKey("");
    setChat([]);
    setModal("");
  }, [user?.id]);
  useEffect(() => {
    const check = () => {
      try {
        setHasDraft(!!localStorage.getItem(draftKey(user?.id)));
      } catch {}
    };
    check();
    window.addEventListener("onfit-draft-change", check);
    return () => window.removeEventListener("onfit-draft-change", check);
  }, [user?.id]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    if (!user) {
      setGuest(null);
      return;
    }
    try {
      const raw = localStorage.getItem("onfit-data");
      const g = raw ? JSON.parse(raw) : null;
      setGuest(isData(g) ? g : null);
    } catch {
      setGuest(null);
    }
  }, [user?.id]);
  const guestMissing =
    guest &&
    user &&
    ready &&
    (guest.workouts.some((w) => !data.workouts.some((x) => x.id === w.id)) ||
      guest.meals.some((w) => !data.meals.some((x) => x.id === w.id)) ||
      guest.body.some((w) => !data.body.some((x) => x.id === w.id)));
  const notify = (t: string) => setToast(t);
  const navigate = (t: string) => {
    setTab(t);
    setMobile(false);
  };
  const todayMeals = data.meals.filter((m) => m.date === day());
  const kcal = todayMeals.reduce((s, m) => s + m.calories, 0);
  const protein = todayMeals.reduce((s, m) => s + m.protein, 0);
  const recent = data.workouts.filter(
    (w) => Date.now() - new Date(w.date).getTime() < 7 * 86400000,
  );
  const weekDays = new Set(recent.map((w) => w.date)).size;
  const current = menu.find((m) => m.id === tab);
  const latestBody = data.body.at(-1);
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready) {
      notify("계정 기록을 불러온 후 다시 시도해 주세요.");
      return;
    }
    const f = new FormData(e.currentTarget);
    const n = (k: string) => Number(f.get(k));
    const s = (k: string) => String(f.get(k) || "");
    if (modal === "meal")
      setData((d) => ({
        ...d,
        meals: [
          ...d.meals,
          {
            id: uid(),
            date: s("date"),
            name: s("name"),
            type: s("type"),
            calories: n("calories"),
            protein: n("protein"),
          },
        ],
      }));
    if (modal === "body")
      setData((d) => ({
        ...d,
        body: [
          ...d.body,
          {
            id: uid(),
            date: s("date"),
            weight: n("weight"),
            muscle: n("muscle"),
            fat: n("fat"),
          },
        ].sort((a, b) => a.date.localeCompare(b.date)),
      }));
    setModal("");
    setPhoto(null);
    notify("기록을 저장했어요. 오늘도 한 걸음 더!");
  }
  async function send(text = message) {
    if (!text.trim() || busy) return;
    if (!key) {
      notify("마이페이지에서 개인 OpenAI API 키를 먼저 연결해 주세요.");
      setTab("settings");
      return;
    }
    setChat((c) => [...c, { role: "user", text }]);
    setMessage("");
    setBusy(true);
    try {
      const r = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          message: text,
          context: {
            goal: data.goal,
            workouts: data.workouts.slice(-15),
            meals: data.meals.slice(-20),
            body: data.body.slice(-5),
            conversation: chat.slice(-6),
          },
        }),
      });
      const j = await r.json();
      setChat((c) => [...c, { role: "assistant", text: j.text || j.error }]);
    } catch {
      notify("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  function remove(kind: "workouts" | "meals" | "body", id: string) {
    setData((d) => ({ ...d, [kind]: d[kind].filter((x) => x.id !== id) }));
    notify("기록을 삭제했어요.");
  }
  const openWorkout = (date = day(), records?: Workout[], repeat = false) => {
    if (!ready) {
      notify("기록을 불러오는 중이에요.");
      return;
    }
    if (
      records &&
      hasDraft &&
      !confirm("진행 중인 임시 운동이 있어요. 선택한 기록으로 교체할까요?")
    )
      return;
    setWorkoutDate(typeof date === "string" ? date : day());
    setWorkoutInitial(records ? { records, repeat } : undefined);
    setModal("workout");
  };
  return (
    <div className="app journal-theme">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" onClick={() => navigate("home")}>
          <span className="brand-mark">
            <Activity size={25} />
          </span>
          onfit<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">MY WELLNESS SPACE</div>
        <nav>
          {menu.map((m) => (
            <button
              key={m.id}
              className={tab === m.id ? "nav-item selected" : "nav-item"}
              onClick={() => navigate(m.id)}
            >
              <m.icon size={20} />
              <span>{m.name}</span>
              {m.id === "coach" && <em>AI</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="coach-promo">
            <span className="promo-icon">
              <Sparkles size={20} />
            </span>
            <b>나에게 맞는 건강한 변화</b>
            <p>
              혼자 고민하지 말고
              <br />
              나만의 AI 코치와 함께해요.
            </p>
            <button onClick={() => navigate("coach")}>
              코치와 이야기하기 <ArrowUpRight size={16} />
            </button>
          </div>
          <button
            className={"nav-item " + (tab === "settings" ? "selected" : "")}
            onClick={() => navigate("settings")}
          >
            <Settings size={19} />
            마이 · 설정
          </button>
          <div className="profile">
            <div className="avatar">나</div>
            <div>
              <b>나의 웰니스 공간</b>
              <small>매일 조금씩, 더 나답게</small>
            </div>
            <button
              className="icon-button"
              onClick={() => navigate("settings")}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header>
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </button>
            <span>내 건강 기록</span>
            <ChevronRight size={14} />
            <b>{current?.name || "마이 · 설정"}</b>
          </div>
          <div className="header-right">
            <a className="private-badge" href="/login">
              <span />
              {user ? "내 계정" : "로그인 · 가입"}
            </a>
            <button
              className="icon-button"
              aria-label="알림"
              onClick={() =>
                notify("새로운 알림이 없어요. 오늘의 기록을 남겨보세요.")
              }
            >
              <Bell size={20} />
            </button>
            <button
              className="avatar small"
              onClick={() => navigate("settings")}
            >
              나
            </button>
          </div>
        </header>
        <main>
          <div className={"sync-banner " + (syncError ? "error" : "")}>
            <ShieldCheck size={16} />
            <span>{status}</span>
            {syncError && <button onClick={retrySync}>다시 시도</button>}
            {syncError && user && ready && (
              <button
                onClick={() => {
                  if (
                    confirm(
                      "현재 미저장 변경을 포기하고 서버에 저장된 기록으로 바꿀까요? 필요한 기록은 먼저 마이·설정에서 백업하세요.",
                    )
                  )
                    replaceWithCloud();
                }}
              >
                서버 기록 다시 불러오기
              </button>
            )}
            {!user && (
              <a href="/login">
                로그인 · 회원가입 <ArrowRight size={13} />
              </a>
            )}
          </div>
          {!ready && (
            <div className="record-loading">
              <p>
                {syncError
                  ? status
                  : "계정 기록을 불러오고 있어요. 잠시 기다려 주세요."}
              </p>
              {syncError && (
                <>
                  <button className="primary" onClick={retrySync}>
                    다시 시도
                  </button>
                  <a href="/login">로그인 화면으로 이동</a>
                </>
              )}
            </div>
          )}
          {guestMissing && (
            <div className="guest-import">
              <div>
                <b>로그인 전에 남긴 기록이 있어요</b>
                <p>
                  이 브라우저의 게스트 기록을 현재 계정으로 가져올 수 있어요.
                  가져온 후에도 게스트 원본은 이 브라우저에 남습니다.
                </p>
              </div>
              <button
                className="primary"
                onClick={() => {
                  if (
                    guest &&
                    confirm(
                      "게스트 기록을 현재 로그인한 계정에 추가할까요? 같은 ID의 기록은 계정에 있는 내용을 유지합니다.",
                    )
                  ) {
                    setData((d) => mergeGuestRecords(d, guest));
                    notify(
                      "기록을 합쳤어요. 상단의 클라우드 저장 완료를 확인해 주세요.",
                    );
                  }
                }}
              >
                게스트 기록 가져오기
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {tab === "workout"
                  ? "YOUR TRAINING JOURNAL"
                  : tab === "home"
                    ? "YOUR DAILY BALANCE"
                    : "BUILD YOUR BETTER SELF"}
              </div>
              <h1>
                {tab === "home"
                  ? "좋은 변화는, 오늘의 기록부터"
                  : current?.name || "마이 · 설정"}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {tab === "home"
                  ? "어제보다 조금 더 나은 나를 위한 여정, 온핏이 함께할게요."
                  : tab === "workout"
                    ? "움직인 순간과 쉬어간 시간, 모두 나의 성장 기록이에요."
                    : tab === "analysis"
                      ? "숫자 너머, 나의 몸이 보내는 변화를 발견하세요."
                      : tab === "body"
                        ? "몸의 변화를 천천히, 꾸준히 살펴보세요."
                        : tab === "meal"
                          ? "잘 먹는 것도 운동의 일부니까요."
                          : tab === "coach"
                            ? "당신의 일상에서 실천할 수 있는 방법을 함께 찾아요."
                            : "내 목표와 AI 연결, 데이터를 관리하세요."}
              </p>
            </div>
            <button className="date-pill" onClick={() => setTab("workout")}>
              <CalendarDays size={16} />
              {new Date().toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </button>
          </div>
          {tab === "home" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-tag">
                    <span /> MAKE TODAY COUNT
                  </span>
                  <h2>
                    무리하지 않아도 괜찮아요.
                    <br />
                    꾸준함이 변화를 만드니까.
                  </h2>
                  <p>
                    오늘의 운동, 컨디션 그리고 식사까지.
                    <br />
                    나를 알아가는 기록을 시작해 보세요.
                  </p>
                  <button
                    className="white-button"
                    onClick={() => openWorkout()}
                  >
                    오늘의 운동 시작하기 <ArrowRight size={17} />
                  </button>
                </div>
                <div className="hero-art">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="art-grid" />
                  <div className="floating-label">
                    <span className="green-dot" /> EVERY REP COUNTS
                  </div>
                  <div className="dumbbell-art">
                    <div className="bar" />
                    <div className="plate p1" />
                    <div className="plate p2" />
                    <div className="plate p3" />
                    <div className="plate p4" />
                  </div>
                  <span className="art-spark s1">✦</span>
                  <span className="art-spark s2">+</span>
                  <div className="art-caption">
                    STRONGER
                    <br />
                    <span>THAN YESTERDAY</span>
                  </div>
                </div>
              </section>
              <div className="stat-grid">
                <Stat
                  title="이번 주 운동"
                  value={String(weekDays)}
                  unit="일"
                  icon={<Dumbbell size={20} />}
                  caption="주 4일 목표로 차근차근"
                  progress={(weekDays / 4) * 100}
                />
                <Stat
                  title="오늘 섭취 열량"
                  value={kcal.toLocaleString()}
                  unit="kcal"
                  icon={<Flame size={20} />}
                  caption="참고 목표 2,000 kcal"
                  progress={(kcal / 2000) * 100}
                  color="orange"
                />
                <Stat
                  title="오늘 단백질"
                  value={String(protein)}
                  unit="g"
                  icon={<Leaf size={20} />}
                  caption="참고 목표 120 g"
                  progress={(protein / 120) * 100}
                  color="green"
                />
                <Stat
                  title="최근 컨디션"
                  value={
                    data.workouts.length
                      ? String(data.workouts.at(-1)?.condition)
                      : "—"
                  }
                  unit="/ 5"
                  icon={<Heart size={20} />}
                  caption={
                    data.workouts.length
                      ? "마지막 운동에 남긴 나의 컨디션"
                      : "운동 후 나의 상태를 기록해요"
                  }
                  progress={(data.workouts.at(-1)?.condition || 0) * 20}
                  color="purple"
                />
              </div>
              <div className="dashboard-columns">
                <section className="card activity-card">
                  <div className="section-title">
                    <div>
                      <span className="tiny-label">STAY CONSISTENT</span>
                      <h3>나의 운동 흐름</h3>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("analysis")}
                    >
                      분석 보기 <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="week-strip">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - 6 + i);
                      const d = date.toLocaleDateString("en-CA");
                      const done = data.workouts.some((w) => w.date === d);
                      return (
                        <div key={i} className={i === 6 ? "today" : ""}>
                          <span>
                            {
                              ["일", "월", "화", "수", "목", "금", "토"][
                                date.getDay()
                              ]
                            }
                          </span>
                          <b>{date.getDate()}</b>
                          <div className={"day-check " + (done ? "done" : "")}>
                            {done ? (
                              <Check size={16} />
                            ) : i === 6 ? (
                              <span className="blue-dot" />
                            ) : (
                              <span className="muted-dot" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="soft-callout">
                    <div className="circle-icon">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <b>
                        {weekDays
                          ? "좋은 흐름을 이어가고 있어요!"
                          : "첫 기록이 변화의 시작이에요"}
                      </b>
                      <p>
                        {weekDays
                          ? `이번 주 ${weekDays}일, 나를 위한 시간을 만들었어요.`
                          : "완벽한 운동보다 오늘의 작은 실천이 중요해요."}
                      </p>
                    </div>
                    <ArrowUpRight size={20} />
                  </div>
                  <div className="section-title recent-title">
                    <h3>최근 운동 기록</h3>
                    <button
                      className="text-button"
                      onClick={() => navigate("workout")}
                    >
                      전체 보기 <ChevronRight size={15} />
                    </button>
                  </div>
                  {data.workouts.length ? (
                    data.workouts
                      .slice(-2)
                      .reverse()
                      .map((w) => <WorkoutRow key={w.id} w={w} />)
                  ) : (
                    <div className="empty-inline">
                      <span className="exercise-icon">
                        <Dumbbell size={24} />
                      </span>
                      <div>
                        <b>아직 운동 기록이 없어요</b>
                        <p>첫 운동을 기록하고 나의 변화를 확인해 보세요.</p>
                      </div>
                      <button
                        className="icon-button"
                        onClick={() => openWorkout()}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  )}
                </section>
                <div className="right-stack">
                  <section className="card condition-card">
                    <div className="section-title">
                      <h3>오늘, 몸은 어떤가요?</h3>
                      <span className="subtle">CONDITION</span>
                    </div>
                    <p>운동 전 잠깐, 내 몸의 목소리에 귀 기울여요.</p>
                    <div className="moods">
                      {["😴", "😕", "😐", "🙂", "😄"].map((m, i) => (
                        <button
                          key={m}
                          onClick={() => {
                            openWorkout();
                            notify(
                              `컨디션 ${i + 1}점 — 운동 기록에서 함께 저장해 주세요.`,
                            );
                          }}
                        >
                          <span>{m}</span>
                          <small>
                            {
                              [
                                "피곤해요",
                                "조금 무거워요",
                                "보통이에요",
                                "괜찮아요",
                                "최고예요",
                              ][i]
                            }
                          </small>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="nutrition-card">
                    <div className="nutrition-top">
                      <span className="nutrition-icon">
                        <Utensils size={22} />
                      </span>
                      <span>BETTER FOOD, BETTER YOU</span>
                    </div>
                    <h3>
                      오늘의 한 끼도
                      <br />
                      나를 위한 선택으로.
                    </h3>
                    <p>
                      식사를 기록하면 더 균형 잡힌
                      <br />
                      내일을 준비할 수 있어요.
                    </p>
                    <button onClick={() => setModal("meal")}>
                      식사 기록하기 <Plus size={16} />
                    </button>
                    <div className="food-art">🥑</div>
                  </section>
                </div>
              </div>
              <div className="bottom-banner">
                <div className="banner-icon">
                  <Sparkles size={23} />
                </div>
                <div>
                  <b>나에게 맞는 방법이 궁금하다면</b>
                  <p>
                    운동과 식사 기록을 바탕으로, AI 코치와 함께 방향을
                    찾아보세요.
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("coach")}
                >
                  AI 코치 만나기 <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
          {tab === "workout" && (
            <WorkoutJournal
              workouts={data.workouts}
              hasDraft={hasDraft}
              onStart={openWorkout}
              onDelete={(ids) => {
                setData((d) => ({
                  ...d,
                  workouts: d.workouts.filter((w) => !ids.includes(w.id)),
                }));
                notify("운동 기록을 삭제했어요.");
              }}
            />
          )}
          {tab === "analysis" && (
            <>
              <div className="toolbar">
                <div className="segmented">
                  <button
                    className={period === "week" ? "active" : ""}
                    onClick={() => setPeriod("week")}
                  >
                    주간 분석
                  </button>
                  <button
                    className={period === "month" ? "active" : ""}
                    onClick={() => setPeriod("month")}
                  >
                    월간 분석
                  </button>
                </div>
                <span className="subtle">
                  최근 {period === "week" ? 7 : 30}일 기준
                </span>
              </div>
              {(() => {
                const filtered = data.workouts.filter(
                  (w) =>
                    Date.now() - new Date(w.date).getTime() <
                    (period === "week" ? 7 : 30) * 86400000,
                );
                const volume = filtered.reduce(
                  (s, w) => s + workoutVolume(w),
                  0,
                );
                return (
                  <>
                    <div className="stat-grid three">
                      <Stat
                        title="운동한 날"
                        value={String(
                          new Set(filtered.map((w) => w.date)).size,
                        )}
                        unit="일"
                        icon={<CalendarDays />}
                        caption="기록이 있는 날짜"
                      />
                      <Stat
                        title="총 운동 볼륨"
                        value={volume.toLocaleString()}
                        unit="kg"
                        icon={<Dumbbell />}
                        caption="중량 × 횟수 × 세트"
                        color="green"
                      />
                      <Stat
                        title="평균 체감 강도"
                        value={
                          filtered.length
                            ? (
                                filtered.reduce((s, w) => s + w.rpe, 0) /
                                filtered.length
                              ).toFixed(1)
                            : "—"
                        }
                        unit="RPE"
                        icon={<Zap />}
                        caption="기록한 운동의 평균"
                        color="orange"
                      />
                    </div>
                    <section className="card">
                      <div className="section-title">
                        <h3>운동 볼륨 추이</h3>
                        <span className="subtle">kg</span>
                      </div>
                      {filtered.length ? (
                        <div className="bar-chart">
                          {Array.from(new Set(filtered.map((w) => w.date)))
                            .sort()
                            .map((date) => {
                              const v = filtered
                                .filter((w) => w.date === date)
                                .reduce((s, w) => s + workoutVolume(w), 0);
                              const max = Math.max(
                                ...filtered.map((w) =>
                                  filtered
                                    .filter((x) => x.date === w.date)
                                    .reduce((s, x) => s + workoutVolume(x), 0),
                                ),
                                1,
                              );
                              return (
                                <div className="chart-column" key={date}>
                                  <b>{v.toLocaleString()}</b>
                                  <div
                                    style={{
                                      height: Math.max((v / max) * 160, 4),
                                    }}
                                  />
                                  <span>{date.slice(5)}</span>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <Empty
                          icon={<BarChart3 />}
                          title="분석할 기록을 기다리고 있어요"
                          text="운동을 기록하면 실제 데이터로 차트가 채워져요."
                        />
                      )}
                    </section>
                    <div className="two-columns">
                      <section className="card">
                        <h3>휴식과 컨디션</h3>
                        <p className="subtle">
                          운동별로 누적 측정한 휴식 시간입니다.
                        </p>
                        {filtered.length ? (
                          filtered.map((w) => (
                            <div className="metric-line" key={w.id}>
                              <span>
                                {w.name}
                                <small>{w.date}</small>
                              </span>
                              <b>
                                {Math.floor(w.rest / 60)}분 {w.rest % 60}초{" "}
                                <small>컨디션 {w.condition}/5</small>
                              </b>
                            </div>
                          ))
                        ) : (
                          <p className="muted-message">
                            첫 운동 후 확인할 수 있어요.
                          </p>
                        )}
                      </section>
                      <section className="card insight">
                        <Sparkles size={24} />
                        <h3>기록을 이해하는 한 단계 더</h3>
                        <p>
                          숫자를 기반으로 내 생활에 맞는 방향을 AI 코치와 함께
                          찾아보세요. 기록이 적을 때는 성급하게 결론 내리지
                          않아요.
                        </p>
                        <button
                          className="primary"
                          onClick={() => navigate("coach")}
                        >
                          내 기록으로 상담하기 <ArrowRight size={16} />
                        </button>
                      </section>
                    </div>
                  </>
                );
              })()}
            </>
          )}
          {tab === "meal" && (
            <>
              <div className="toolbar">
                <h3>작은 선택이 만드는 균형</h3>
                <button className="primary" onClick={() => setModal("meal")}>
                  <Plus size={18} /> 식사 기록
                </button>
              </div>
              <div className="stat-grid three">
                <Stat
                  title="오늘 섭취"
                  value={String(kcal)}
                  unit="kcal"
                  icon={<Flame />}
                  caption="입력한 영양정보 기준"
                  color="orange"
                />
                <Stat
                  title="오늘 단백질"
                  value={String(protein)}
                  unit="g"
                  icon={<Leaf />}
                  caption="입력한 영양정보 기준"
                  color="green"
                />
                <Stat
                  title="오늘 기록한 식사"
                  value={String(todayMeals.length)}
                  unit="끼"
                  icon={<Utensils />}
                  caption="간식도 함께 기록하세요"
                />
              </div>
              <section className="card">
                {data.meals.length ? (
                  data.meals
                    .slice()
                    .reverse()
                    .map((m) => (
                      <div className="meal-row" key={m.id}>
                        <div className="meal-emoji">
                          {m.type === "아침"
                            ? "🥣"
                            : m.type === "간식"
                              ? "🍎"
                              : "🥗"}
                        </div>
                        <div>
                          <small>
                            {m.date} · {m.type}
                          </small>
                          <h3>{m.name}</h3>
                          <p>단백질 {m.protein} g</p>
                        </div>
                        <strong>
                          {m.calories} <small>kcal</small>
                        </strong>
                        <button
                          className="delete-static"
                          aria-label="식사 삭제"
                          onClick={() => remove("meals", m.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                ) : (
                  <Empty
                    icon={<Utensils />}
                    title="오늘 무엇을 드셨나요?"
                    text="메뉴와 양을 기록해 나의 식사 패턴을 알아가세요. 영양정보는 직접 확인해 입력합니다."
                    action="첫 식사 기록"
                    onClick={() => setModal("meal")}
                  />
                )}
              </section>
              <div className="bottom-banner">
                <Leaf />
                <div>
                  <b>식사의 정답보다, 지속 가능한 습관</b>
                  <p>
                    나의 식사 기록을 바탕으로 실천 가능한 변화를 이야기해
                    보세요.
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("coach")}
                >
                  코치에게 물어보기 <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {tab === "body" && (
            <>
              <div className="toolbar">
                <h3>비교는 어제의 나와만</h3>
                <button className="primary" onClick={() => setModal("body")}>
                  <Upload size={18} /> 인바디 기록
                </button>
              </div>
              <div className="stat-grid three">
                <Stat
                  title="최근 체중"
                  value={latestBody ? String(latestBody.weight) : "—"}
                  unit="kg"
                  icon={<Activity />}
                  caption={latestBody?.date || "측정값을 입력해 주세요"}
                />
                <Stat
                  title="골격근량"
                  value={latestBody ? String(latestBody.muscle) : "—"}
                  unit="kg"
                  icon={<Dumbbell />}
                  caption="최근 측정 기준"
                  color="green"
                />
                <Stat
                  title="체지방률"
                  value={latestBody ? String(latestBody.fat) : "—"}
                  unit="%"
                  icon={<Target />}
                  caption="최근 측정 기준"
                  color="orange"
                />
              </div>
              <section className="card">
                <h3>몸의 변화 기록</h3>
                {data.body.length ? (
                  data.body
                    .slice()
                    .reverse()
                    .map((b) => (
                      <div className="metric-line" key={b.id}>
                        <span>
                          {b.date}
                          <small>체성분 측정</small>
                        </span>
                        <b>
                          {b.weight} kg
                          <small>
                            골격근 {b.muscle} kg · 체지방 {b.fat}%
                          </small>
                        </b>
                        <button
                          className="delete-static"
                          aria-label="인바디 삭제"
                          onClick={() => remove("body", b.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                ) : (
                  <Empty
                    icon={<Activity />}
                    title="몸의 변화를 기록해 보세요"
                    text="인바디 사진을 보며 수치를 입력할 수 있어요. 사진 자동 판독은 추후 연결 예정입니다."
                    action="측정 결과 추가"
                    onClick={() => setModal("body")}
                  />
                )}
              </section>
            </>
          )}
          {tab === "coach" && (
            <section className="card chat-card">
              <div className="chat-heading">
                <span className="chat-avatar">
                  <Sparkles size={23} />
                </span>
                <div>
                  <h3>나를 위한 AI 코치</h3>
                  <p>
                    {key
                      ? "개인 OpenAI API 연결됨 · 사용량에 따라 개인 계정 과금"
                      : "개인 API 키 연결이 필요해요"}
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("settings")}
                >
                  연결 설정 <Settings size={16} />
                </button>
              </div>
              <div className="chat-messages">
                {!chat.length && (
                  <div className="chat-welcome">
                    <span className="big-spark">
                      <Sparkles size={36} />
                    </span>
                    <h2>건강한 변화, 함께 찾아볼까요?</h2>
                    <p>
                      목표도, 생활도, 할 수 있는 것도 다르니까.
                      <br />
                      지금 나에게 맞는 작은 실천부터 시작해요.
                    </p>
                    <div className="suggestions">
                      {[
                        "내 운동 기록을 분석해 줘",
                        "예산에 맞는 고단백 식사를 추천해 줘",
                        "원하는 몸을 위한 목표를 함께 정하고 싶어",
                      ].map((t) => (
                        <button key={t} onClick={() => send(t)}>
                          {t}
                          <ArrowUpRight size={15} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chat.map((m, i) => (
                  <div className={"chat-bubble " + m.role} key={i}>
                    {m.text}
                  </div>
                ))}
                {busy && (
                  <div className="chat-bubble assistant">
                    나에게 맞는 방법을 생각하고 있어요…
                  </div>
                )}
              </div>
              <form
                className="chat-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  aria-label="코치에게 질문"
                  placeholder="목표, 식습관, 고민을 자유롭게 이야기해 주세요"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={4000}
                />
                <button disabled={busy || !message.trim()} aria-label="전송">
                  <Send size={19} />
                </button>
              </form>
              <small className="chat-disclaimer">
                AI의 답변은 참고용이며 의료 진단을 대신하지 않습니다. API 키는
                현재 페이지 메모리에만 보관됩니다.
              </small>
            </section>
          )}
          {tab === "settings" && (
            <>
              <AccountPanel />
              <div className="settings-grid">
                <section className="card">
                  <div className="section-title">
                    <h3>나의 목표</h3>
                    <Target size={21} />
                  </div>
                  <label>
                    어떤 변화를 만들고 싶나요?
                    <textarea
                      value={data.goal}
                      onChange={(e) =>
                        setData((d) => ({ ...d, goal: e.target.value }))
                      }
                    />
                  </label>
                  <p className="subtle">
                    목표는 자동 저장되며 AI 상담의 참고 정보로 사용돼요.
                  </p>
                </section>
                <section className="card">
                  <div className="section-title">
                    <h3>개인 AI 연결</h3>
                    <Sparkles size={21} />
                  </div>
                  <p className="settings-description">
                    본인의 OpenAI API 키를 연결하세요. ChatGPT 구독과 별도로 API
                    사용료가 본인 계정에 발생합니다.
                  </p>
                  <label>
                    OpenAI API 키
                    <input
                      type="password"
                      autoComplete="off"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="sk-…"
                    />
                  </label>
                  <div className="secure-note">
                    <ShieldCheck size={17} />
                    <span>
                      키는 디스크에 저장하지 않으며 새로고침하면 지워집니다. AI
                      요청 시 서버를 통해 OpenAI로 전달됩니다.
                    </span>
                  </div>
                  <button
                    className="primary"
                    onClick={() =>
                      key.startsWith("sk-")
                        ? (navigate("coach"),
                          notify("질문을 전송하면 연결을 확인할 수 있어요."))
                        : notify("sk-로 시작하는 API 키를 입력해 주세요.")
                    }
                  >
                    AI 코치 열기 <ArrowRight size={16} />
                  </button>
                  {key && (
                    <button
                      className="text-button disconnect"
                      onClick={() => {
                        setKey("");
                        notify("API 키 연결을 해제했어요.");
                      }}
                    >
                      연결 해제
                    </button>
                  )}
                </section>
                <section className="card">
                  <h3>내 데이터 관리</h3>
                  <p className="settings-description">
                    {user
                      ? "로그인한 계정의 기록은 클라우드에 저장됩니다. 저장 상태를 확인하고 중요한 기록은 별도로 백업하세요."
                      : "게스트 기록은 이 브라우저에만 저장됩니다. 로그인 후 가져오기 버튼으로 계정에 옮길 수 있어요."}
                  </p>
                  <button
                    className="outline-button"
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob([JSON.stringify(data, null, 2)], {
                          type: "application/json",
                        }),
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `onfit-${day()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={17} /> 데이터 내보내기
                  </button>
                  <label className="import-label">
                    백업 파일 복원
                    <input
                      type="file"
                      accept="application/json"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          const d = JSON.parse(await f.text());
                          if (!isData(d)) throw Error();
                          if (
                            confirm(
                              "현재 기록을 백업 파일의 기록으로 교체할까요?",
                            )
                          ) {
                            setData(d);
                            notify("백업을 복원했어요.");
                          }
                        } catch {
                          notify("올바른 온핏 백업 파일을 선택해 주세요.");
                        }
                      }}
                    />
                  </label>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (
                        confirm(
                          "현재 계정 또는 게스트 공간의 모든 건강 기록과 임시 운동을 삭제할까요? 되돌릴 수 없습니다.",
                        )
                      ) {
                        setData(empty);
                        try {
                          localStorage.removeItem(draftKey(user?.id));
                        } catch {}
                        setHasDraft(false);
                        setChat([]);
                        setKey("");
                        notify("모든 기록을 삭제했어요.");
                      }
                    }}
                  >
                    <Trash2 size={16} /> 모든 기록 삭제
                  </button>
                </section>
                <section className="card">
                  <h3>현재 버전 안내</h3>
                  <div className="metric-line">
                    <span>기록 저장</span>
                    <b>
                      {user ? "계정별 클라우드 저장" : "브라우저 로컬 저장"}
                    </b>
                  </div>
                  <div className="metric-line">
                    <span>AI 사용</span>
                    <b>개인 API 키 방식</b>
                  </div>
                  <div className="metric-line">
                    <span>계정 · 클라우드 동기화</span>
                    <b>{user ? "연결됨" : "로그인 필요"}</b>
                  </div>
                  <p className="settings-description">
                    사진 자동 판독과 클라우드 사진 보관은 아직 제공하지
                    않습니다. 같은 기기에서도 다른 계정의 기록은 분리됩니다.
                  </p>
                </section>
              </div>
            </>
          )}
          <footer>
            <span className="footer-brand">onfit.</span>
            <span>작은 기록이 만드는, 나다운 변화.</span>
            <span className="footer-right">
              <ShieldCheck size={13} /> 나만의 건강 기록
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {menu
          .filter((m) =>
            ["home", "workout", "analysis", "meal", "coach"].includes(m.id),
          )
          .map((m) => (
            <button
              key={m.id}
              className={tab === m.id ? "active" : ""}
              onClick={() => navigate(m.id)}
            >
              <m.icon size={21} />
              <span>{m.id === "home" ? "요약" : m.name}</span>
            </button>
          ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
      {modal === "workout" && (
        <WorkoutEditor
          key={user?.id || "guest"}
          userId={user?.id}
          date={workoutDate}
          history={data.workouts}
          initial={workoutInitial}
          onClose={() => setModal("")}
          onSave={(records, replaceIds) => {
            setData((d) => ({
              ...d,
              workouts: [
                ...d.workouts.filter((w) => !replaceIds?.includes(w.id)),
                ...records,
              ],
            }));
            setHasDraft(false);
            setModal("");
            setTab("workout");
            notify("세트별 중량·횟수·휴식을 저장했어요.");
          }}
        />
      )}
      {modal && modal !== "workout" && (
        <div className="modal-backdrop" onClick={() => {}}>
          <section className="modal">
            <div className="modal-heading">
              <div>
                <span className="tiny-label">ONE STEP FOR YOURSELF</span>
                <h2>{modal === "meal" ? "오늘의 식사 기록" : "인바디 기록"}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="닫기"
                onClick={() => {
                  setModal("");
                  setPhoto(null);
                }}
              >
                <X />
              </button>
            </div>
            <form onSubmit={save}>
              <label>
                날짜
                <input type="date" name="date" defaultValue={day()} required />
              </label>
              {modal === "meal" && (
                <>
                  <label>
                    식사 종류
                    <select name="type">
                      <option>아침</option>
                      <option>점심</option>
                      <option>저녁</option>
                      <option>간식</option>
                    </select>
                  </label>
                  <label>
                    음식과 양
                    <input
                      name="name"
                      placeholder="예: 현미밥 1공기, 닭가슴살 100g"
                      maxLength={200}
                      required
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      열량 (kcal)
                      <input
                        type="number"
                        name="calories"
                        min="0"
                        max="20000"
                        required
                        placeholder="영양표 확인"
                      />
                    </label>
                    <label>
                      단백질 (g)
                      <input
                        type="number"
                        name="protein"
                        min="0"
                        max="1000"
                        step="0.1"
                        required
                        placeholder="영양표 확인"
                      />
                    </label>
                  </div>
                  <div className="secure-note">
                    <Leaf size={18} />
                    <span>
                      영양정보는 제품 표시 또는 확인한 값을 입력해 주세요. 음식
                      사진의 자동 분석은 아직 제공되지 않습니다.
                    </span>
                  </div>
                </>
              )}
              {modal === "body" && (
                <>
                  <label className="upload-zone">
                    <Upload size={28} />
                    <b>인바디 사진 참고하기</b>
                    <span>사진을 보면서 아래 수치를 직접 입력하세요</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 10 * 1024 * 1024) {
                          notify("10MB 이하 사진을 선택해 주세요.");
                          return;
                        }
                        const r = new FileReader();
                        r.onload = () => setPhoto(String(r.result));
                        r.readAsDataURL(f);
                      }}
                    />
                  </label>
                  {photo && (
                    <img
                      className="body-photo"
                      src={photo}
                      alt="참고용 인바디 결과"
                    />
                  )}
                  <div className="form-row">
                    <label>
                      체중 (kg)
                      <input
                        name="weight"
                        type="number"
                        min="20"
                        max="400"
                        step="0.1"
                        required
                      />
                    </label>
                    <label>
                      골격근량 (kg)
                      <input
                        name="muscle"
                        type="number"
                        min="1"
                        max="150"
                        step="0.1"
                        required
                      />
                    </label>
                    <label>
                      체지방률 (%)
                      <input
                        name="fat"
                        type="number"
                        min="1"
                        max="75"
                        step="0.1"
                        required
                      />
                    </label>
                  </div>
                  <p className="subtle">
                    사진은 저장·전송되지 않습니다. 확인한 수치만 브라우저에
                    저장됩니다.
                  </p>
                </>
              )}
              <button type="submit" className="primary save-button">
                <Check size={18} /> 기록 저장하기
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Stat({
  title,
  value,
  unit,
  icon,
  caption,
  progress,
  color = "blue",
}: {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  caption: string;
  progress?: number;
  color?: string;
}) {
  return (
    <section className={"stat-card " + color}>
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">
        {value}
        <small>{unit}</small>
      </div>
      {progress !== undefined && (
        <div className="progress">
          <span style={{ width: Math.min(100, Math.max(0, progress)) + "%" }} />
        </div>
      )}
      <p>{caption}</p>
    </section>
  );
}
function WorkoutRow({ w }: { w: Workout }) {
  return (
    <div className="workout-row">
      <span className="exercise-icon">
        <Dumbbell size={23} />
      </span>
      <div>
        <b>{w.name}</b>
        <p>
          {w.date} <span>·</span> {w.sets}세트 ·{" "}
          {workoutVolume(w).toLocaleString()}kg 볼륨
        </p>
      </div>
      <span className="workout-badge">
        <Check size={12} /> 완료
      </span>
    </div>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="primary" onClick={onClick}>
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}
