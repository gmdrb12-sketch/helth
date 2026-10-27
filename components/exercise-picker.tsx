"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Heart,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { exercises } from "../lib/workout";
import type { Workout } from "../lib/records";
import ExerciseIllustration from "./exercise-illustration";
type Item = { name: string; group: string; equipment: string };
const equipment = (name: string) =>
  /런지|트라이셉스 익스텐션/.test(name)
    ? "덤벨"
    : /케이블/.test(name)
      ? "케이블"
      : /덤벨/.test(name)
        ? "덤벨"
        : /바벨|벤치프레스|스쿼트|데드리프트|오버헤드프레스/.test(name)
          ? "바벨"
          : /푸시업|풀업|크런치|행잉/.test(name)
            ? "맨몸"
            : "머신";
const base: Item[] = [
  ...exercises.map(([name, group]) => ({
    name,
    group:
      group === "팔"
        ? /트라이셉스|푸시다운/.test(name)
          ? "삼두"
          : "이두"
        : group,
    equipment: equipment(name),
  })),
  ...[
    ["케이블 시티드 로우", "등", "케이블"],
    ["어시스트 머신 풀업", "등", "머신"],
    ["V-bar 랫풀다운", "등", "케이블"],
    ["머신 와이드 풀다운", "등", "머신"],
    ["해머 컬", "이두", "덤벨"],
    ["러닝", "유산소", "유산소"],
    ["사이클", "유산소", "유산소"],
    ["전신 스트레칭", "전신", "스트레칭"],
  ].map(([name, group, equipment]) => ({ name, group, equipment })),
];
export default function ExercisePicker({
  history,
  storageId,
  onAdd,
  onClose,
}: {
  history: Workout[];
  storageId: string;
  onAdd: (names: string[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState(""),
    [tab, setTab] = useState("전체"),
    [body, setBody] = useState("전체"),
    [gear, setGear] = useState("전체"),
    [selected, setSelected] = useState<string[]>([]),
    [favorites, setFavorites] = useState<string[]>([]),
    [custom, setCustom] = useState<Item[]>([]),
    [customMode, setCustomMode] = useState(false),
    [customName, setCustomName] = useState(""),
    [customBody, setCustomBody] = useState("등"),
    [customGear, setCustomGear] = useState("머신");
  const key = `onfit-exercise-library:${storageId}`;
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "{}");
      if (Array.isArray(value.favorites))
        setFavorites(
          value.favorites.filter((n: unknown) => typeof n === "string"),
        );
      if (Array.isArray(value.custom))
        setCustom(
          value.custom.filter(
            (i: Item) =>
              typeof i.name === "string" &&
              typeof i.group === "string" &&
              typeof i.equipment === "string",
          ),
        );
    } catch {}
  }, [key]);
  function persist(f: string[], c: Item[]) {
    try {
      localStorage.setItem(key, JSON.stringify({ favorites: f, custom: c }));
    } catch {}
  }
  function favorite(name: string) {
    const next = favorites.includes(name)
      ? favorites.filter((n) => n !== name)
      : [...favorites, name];
    setFavorites(next);
    persist(next, custom);
  }
  function toggle(name: string) {
    setSelected((s) =>
      s.includes(name) ? s.filter((n) => n !== name) : [...s, name],
    );
  }
  const items = [...base, ...custom];
  const count = (name: string) => history.filter((w) => w.name === name).length;
  const filtered = items
    .filter(
      (i) =>
        (body === "전체" ||
          i.group === body ||
          (body === "이두" && i.group === "팔") ||
          (body === "삼두" && i.group === "팔")) &&
        (gear === "전체" || i.equipment === gear) &&
        (tab !== "좋아하는" || favorites.includes(i.name)) &&
        (tab !== "최근" || count(i.name) > 0) &&
        (tab !== "자주하는" || count(i.name) > 0) &&
        (tab !== "커스텀" || custom.some((c) => c.name === i.name)) &&
        i.name
          .replaceAll(" ", "")
          .toLowerCase()
          .includes(search.replaceAll(" ", "").toLowerCase()),
    )
    .sort((a, b) =>
      tab === "자주하는"
        ? count(b.name) - count(a.name)
        : tab === "최근"
          ? history.findLastIndex((w) => w.name === b.name) -
            history.findLastIndex((w) => w.name === a.name)
          : 0,
    );
  return (
    <div
      className="library-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="운동 선택"
    >
      <div className="library-shell">
        <div className="library-searchbar">
          <button aria-label="운동 선택 닫기" onClick={onClose}>
            <ArrowLeft size={26} />
          </button>
          <div>
            <Search size={20} />
            <input
              autoFocus
              aria-label="운동 검색"
              placeholder="운동 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="검색 지우기" onClick={() => setSearch("")}>
                <X size={17} />
              </button>
            )}
          </div>
          <button
            aria-label="커스텀 운동 만들기"
            onClick={() => setCustomMode(true)}
          >
            <Plus size={25} />
          </button>
        </div>
        <div className="library-tabs">
          {["전체", "좋아하는", "자주하는", "최근", "커스텀"].map((t) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="library-filters body-filter" aria-label="부위 필터">
          {[
            "전체",
            "가슴",
            "등",
            "어깨",
            "삼두",
            "이두",
            "하체",
            "코어",
            "전신",
            "유산소",
          ].map((t) => (
            <button
              key={t}
              className={body === t ? "selected" : ""}
              onClick={() => setBody(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="library-filters gear-filter" aria-label="기구 필터">
          {[
            "전체",
            "맨몸",
            "유산소",
            "스트레칭",
            "덤벨",
            "바벨",
            "머신",
            "케이블",
          ].map((t) => (
            <button
              key={t}
              className={gear === t ? "selected" : ""}
              onClick={() => setGear(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          className="library-custom"
          onClick={() => {
            setCustomName(search);
            setCustomMode(true);
          }}
        >
          <Plus size={21} /> 커스텀 운동 추가
        </button>
        <div className="library-options exercise-options">
          {filtered.map((item) => (
            <div
              className={
                "library-item " + (selected.includes(item.name) ? "picked" : "")
              }
              key={item.name}
            >
              <button
                className={
                  "favorite-button " +
                  (favorites.includes(item.name) ? "favorited" : "")
                }
                aria-label={`${item.name} 즐겨찾기`}
                aria-pressed={favorites.includes(item.name)}
                onClick={() => favorite(item.name)}
              >
                <Heart
                  size={19}
                  fill={favorites.includes(item.name) ? "currentColor" : "none"}
                />
              </button>
              <button
                className="library-select"
                aria-label={`${item.name} 선택`}
                aria-pressed={selected.includes(item.name)}
                onClick={() => toggle(item.name)}
              >
                <ExerciseIllustration name={item.name} small />
                <span>
                  <b>
                    {item.name}{" "}
                    {selected.includes(item.name) && <Check size={19} />}
                  </b>
                  <small>
                    {item.group} · {item.equipment}
                  </small>
                </span>
              </button>
              <button
                className="library-select-add"
                aria-label={`${item.name} 선택 전환`}
                onClick={() => toggle(item.name)}
              >
                {selected.includes(item.name) ? (
                  <Check size={19} />
                ) : (
                  <Plus size={19} />
                )}
              </button>
            </div>
          ))}
          {!filtered.length && (
            <div className="library-empty">
              조건에 맞는 운동이 없어요.
              <br />
              <button
                onClick={() => {
                  setCustomName(search);
                  setCustomMode(true);
                }}
              >
                직접 운동 추가하기
              </button>
            </div>
          )}
        </div>
        <div className="library-bottom">
          <span>
            {selected.length
              ? "원하는 순서대로 선택했어요"
              : "운동을 여러 개 골라 한 번에 추가하세요"}
          </span>
          <div>
            <button
              className="library-reset"
              aria-label="선택 초기화"
              onClick={() => setSelected([])}
            >
              <RotateCcw size={22} />
            </button>
            <button
              className="library-confirm"
              disabled={!selected.length}
              onClick={() => onAdd(selected)}
            >
              <Plus size={23} />
              {selected.length} 운동 추가
            </button>
          </div>
        </div>
        {customMode && (
          <div className="custom-builder-backdrop">
            <form
              className="custom-builder"
              onSubmit={(e) => {
                e.preventDefault();
                const name = customName.trim();
                if (!name) return;
                const existing = items.find((i) => i.name === name);
                if (!existing) {
                  const next = [
                    ...custom,
                    { name, group: customBody, equipment: customGear },
                  ];
                  setCustom(next);
                  persist(favorites, next);
                }
                setSelected((s) => (s.includes(name) ? s : [...s, name]));
                setTab("커스텀");
                setBody("전체");
                setGear("전체");
                setSearch("");
                setCustomMode(false);
              }}
            >
              <div>
                <h2>커스텀 운동</h2>
                <button
                  type="button"
                  aria-label="커스텀 만들기 닫기"
                  onClick={() => setCustomMode(false)}
                >
                  <X size={21} />
                </button>
              </div>
              <label>
                운동 이름
                <input
                  autoFocus
                  required
                  maxLength={60}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="나만의 운동 이름"
                />
              </label>
              <div className="form-row">
                <label>
                  부위
                  <select
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                  >
                    {[
                      "가슴",
                      "등",
                      "어깨",
                      "삼두",
                      "이두",
                      "하체",
                      "코어",
                      "전신",
                      "유산소",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  기구
                  <select
                    value={customGear}
                    onChange={(e) => setCustomGear(e.target.value)}
                  >
                    {[
                      "맨몸",
                      "덤벨",
                      "바벨",
                      "머신",
                      "케이블",
                      "유산소",
                      "스트레칭",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="submit" className="library-confirm">
                만들고 선택하기
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
