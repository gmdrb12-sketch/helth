"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { duration, type Workout, workoutSets } from "../lib/records";
import {
  addExercise,
  completeSet,
  deleteSet,
  draftKey,
  exercises,
  fromRecords,
  newDraft,
  newSet,
  nextSet,
  saveWorkout,
  startSet,
  validDraft,
  type WorkoutDraft,
} from "../lib/workout";
type Props = {
  userId?: string;
  date: string;
  history: Workout[];
  initial?: { records: Workout[]; repeat: boolean };
  onSave: (records: Workout[], replaceIds?: string[]) => void;
  onClose: () => void;
};
export default function WorkoutEditor({
  userId,
  date,
  history,
  initial,
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<WorkoutDraft | null>(null),
    [picker, setPicker] = useState(false),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("전체"),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState(""),
    [restGoal, setRestGoal] = useState(90);
  const loaded = useRef(false),
    storage = draftKey(userId);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    let d = initial
      ? fromRecords(initial.records, initial.repeat, date)
      : newDraft(date);
    if (!initial) {
      try {
        const raw = localStorage.getItem(storage);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (validDraft(parsed)) d = parsed;
        }
      } catch {
        setError(
          "진행 중 기록을 복원하지 못했어요. 저장소 상태를 확인해 주세요.",
        );
      }
    }
    setDraft(d);
    setPicker(!d.exercises.length);
  }, [date, initial, storage]);
  useEffect(() => {
    if (!draft) return;
    try {
      localStorage.setItem(storage, JSON.stringify(draft));
      window.dispatchEvent(new Event("onfit-draft-change"));
    } catch {
      setError(
        "진행 중 기록의 임시 저장에 실패했어요. 이 창을 닫기 전에 운동 기록을 저장해 주세요.",
      );
    }
  }, [draft, storage]);
  useEffect(() => {
    if (!draft?.rest) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [draft?.rest]);
  if (!draft)
    return (
      <div className="training-overlay">
        <p>운동 기록을 불러오고 있어요…</p>
      </div>
    );
  const update = (f: (d: WorkoutDraft) => WorkoutDraft) =>
    setDraft((d) => (d ? f(d) : d));
  const finished = draft.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.completed).length,
    0,
  );
  const planned = draft.exercises.reduce((n, e) => n + e.sets.length, 0);
  const pending = nextSet(draft),
    active = draft.exercises
      .flatMap((e) => e.sets)
      .find((s) => s.id === draft.activeSetId);
  const elapsed = draft.rest
    ? Math.max(0, Math.floor((now - draft.rest.startedAt) / 1000))
    : 0;
  const fromExercise = draft.exercises.find(
    (e) => e.id === draft.rest?.fromExerciseId,
  );
  const fromIndex =
    fromExercise?.sets.findIndex((s) => s.id === draft.rest?.fromSetId) ?? -1;
  const restKind =
    pending && pending.exercise.id === draft.rest?.fromExerciseId
      ? "세트 사이"
      : "운동 사이";
  function add(name: string) {
    const prev = history.filter((w) => w.name === name).at(-1);
    update((d) => addExercise(d, name, prev));
    setPicker(false);
    setSearch("");
    setError("");
  }
  function finish() {
    if (!draft) return;
    if (!draft.date || !draft.title.trim()) {
      setError("운동 제목과 날짜를 입력해 주세요.");
      return;
    }
    if (
      draft.exercises.some((e) =>
        e.sets.some(
          (s) =>
            s.completed &&
            (!Number.isFinite(s.weight) ||
              s.weight < 0 ||
              s.weight > 1000 ||
              !Number.isInteger(s.reps) ||
              s.reps < 1 ||
              s.reps > 1000 ||
              !Number.isFinite(s.rpe) ||
              s.rpe < 1 ||
              s.rpe > 10),
        ),
      )
    ) {
      setError("완료한 세트의 중량·횟수·RPE를 확인해 주세요.");
      return;
    }
    if (!finished) {
      setError("완료한 세트가 없어요. 기록할 세트의 완료 버튼을 눌러 주세요.");
      return;
    }
    if (
      planned > finished &&
      !confirm(
        `완료하지 않은 ${planned - finished}세트는 제외하고 ${finished}세트만 저장할까요?`,
      )
    )
      return;
    const records = saveWorkout(draft);
    try {
      localStorage.removeItem(storage);
      window.dispatchEvent(new Event("onfit-draft-change"));
    } catch {}
    onSave(records, draft.editingIds);
  }
  function patch(
    exerciseId: string,
    setId: string,
    field: "weight" | "reps" | "rpe",
    value: number,
  ) {
    update((d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, [field]: value } : s,
              ),
            }
          : e,
      ),
    }));
  }
  return (
    <div
      className="training-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="운동 세트 기록"
    >
      <div className="training-shell">
        <header className="training-header">
          <button
            className="icon-button"
            aria-label="기록 화면 닫기"
            onClick={onClose}
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <b>{draft.editingIds ? "운동 기록 수정" : "운동 기록 중"}</b>
            <span>입력 내용은 임시 저장돼요</span>
          </div>
          <button className="training-save" onClick={finish}>
            운동 저장 <Check size={17} />
          </button>
        </header>
        <div className="training-content">
          <div className="training-title">
            <input
              aria-label="운동 제목"
              value={draft.title}
              maxLength={60}
              onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
            />
            <div>
              <input
                type="date"
                aria-label="운동 날짜"
                value={draft.date}
                onChange={(e) =>
                  update((d) => ({ ...d, date: e.target.value }))
                }
              />
              <span>
                {draft.exercises.length}개 운동 <i /> {finished}/{planned}세트
                완료
              </span>
            </div>
          </div>
          {error && (
            <div className="training-error" role="alert">
              {error}
              <button aria-label="안내 닫기" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          <div className="training-layout">
            <div className="training-exercises">
              {draft.exercises.length === 0 && (
                <div className="training-empty">
                  <Dumbbell size={34} />
                  <h2>오늘은 어떤 운동을 할까요?</h2>
                  <p>운동을 고르고 세트마다 무게와 횟수를 기록하세요.</p>
                  <button className="primary" onClick={() => setPicker(true)}>
                    <Plus size={17} /> 운동 선택
                  </button>
                </div>
              )}
              {draft.exercises.map((exercise, exerciseIndex) => {
                const previous = history
                  .filter(
                    (w) =>
                      w.name === exercise.name &&
                      !draft.editingIds?.includes(w.id),
                  )
                  .at(-1);
                const prevSets = previous ? workoutSets(previous) : [];
                return (
                  <section className="exercise-sheet" key={exercise.id}>
                    <div className="exercise-sheet-title">
                      <span className="exercise-order">
                        {String(exerciseIndex + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h2>{exercise.name}</h2>
                        <p>
                          {previous
                            ? `이전 기록 ${previous.date} · ${previous.sets}세트`
                            : "첫 기록 · 나에게 맞는 무게부터 시작하세요"}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`${exercise.name} 운동 삭제`}
                        onClick={() => {
                          if (
                            !confirm(
                              `${exercise.name}과 해당 세트 기록을 삭제할까요?`,
                            )
                          )
                            return;
                          update((d) => {
                            let result = d;
                            for (const s of exercise.sets)
                              result = deleteSet(result, exercise.id, s.id);
                            return {
                              ...result,
                              exercises: result.exercises.filter(
                                (e) => e.id !== exercise.id,
                              ),
                            };
                          });
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <div className="set-grid set-grid-head">
                      <span>세트</span>
                      <span className="previous-cell">이전 기록</span>
                      <span>kg</span>
                      <span>회</span>
                      <span>RPE</span>
                      <span>완료</span>
                      <span />
                    </div>
                    {exercise.sets.map((set, index) => {
                      const isActive = draft.activeSetId === set.id;
                      const blocked = !!draft.activeSetId && !isActive;
                      const previousSet = prevSets[index];
                      return (
                        <div
                          className={
                            "set-line " +
                            (set.completed ? "completed " : "") +
                            (isActive ? "set-active" : "")
                          }
                          key={set.id}
                        >
                          <div className="set-grid">
                            <span className="set-number">{index + 1}</span>
                            <span className="previous-cell">
                              {previousSet
                                ? `${previousSet.weight} × ${previousSet.reps}`
                                : "—"}
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              onFocus={(e) => e.currentTarget.select()}
                              aria-label={`${exercise.name} ${index + 1}세트 중량`}
                              min="0"
                              max="1000"
                              step="0.5"
                              value={set.weight}
                              onChange={(e) =>
                                patch(
                                  exercise.id,
                                  set.id,
                                  "weight",
                                  Number(e.target.value),
                                )
                              }
                            />
                            <input
                              type="number"
                              inputMode="numeric"
                              onFocus={(e) => e.currentTarget.select()}
                              aria-label={`${exercise.name} ${index + 1}세트 횟수`}
                              min="1"
                              max="1000"
                              step="1"
                              value={set.reps}
                              onChange={(e) =>
                                patch(
                                  exercise.id,
                                  set.id,
                                  "reps",
                                  Number(e.target.value),
                                )
                              }
                            />
                            <input
                              type="number"
                              inputMode="decimal"
                              onFocus={(e) => e.currentTarget.select()}
                              aria-label={`${exercise.name} ${index + 1}세트 RPE`}
                              min="1"
                              max="10"
                              step="0.5"
                              value={set.rpe}
                              onChange={(e) =>
                                patch(
                                  exercise.id,
                                  set.id,
                                  "rpe",
                                  Number(e.target.value),
                                )
                              }
                            />
                            <button
                              className={
                                "set-complete " +
                                (set.completed ? "is-done" : "")
                              }
                              aria-label={`${exercise.name} ${index + 1}세트 ${set.completed ? "완료됨" : draft.rest ? "시작" : "완료"}`}
                              disabled={set.completed || blocked}
                              onClick={() => {
                                setError("");
                                if (draft.rest) {
                                  update((d) =>
                                    startSet(d, exercise.id, set.id),
                                  );
                                  return;
                                }
                                if (
                                  !Number.isFinite(set.weight) ||
                                  set.weight < 0 ||
                                  set.weight > 1000 ||
                                  !Number.isInteger(set.reps) ||
                                  set.reps < 1 ||
                                  set.reps > 1000 ||
                                  set.rpe < 1 ||
                                  set.rpe > 10
                                ) {
                                  setError(
                                    "중량 0–1000kg, 횟수 1–1000회, RPE 1–10을 입력해 주세요.",
                                  );
                                  return;
                                }
                                update((d) =>
                                  completeSet(d, exercise.id, set.id),
                                );
                              }}
                            >
                              {set.completed ? (
                                <Check size={18} />
                              ) : draft.rest ? (
                                <Play size={16} />
                              ) : (
                                <Check size={18} />
                              )}
                            </button>
                            <button
                              className="set-delete"
                              aria-label={`${exercise.name} ${index + 1}세트 삭제`}
                              onClick={() => {
                                if (
                                  set.completed &&
                                  !confirm(
                                    "완료한 세트와 이 세트의 휴식 기록을 삭제할까요?",
                                  )
                                )
                                  return;
                                update((d) =>
                                  deleteSet(d, exercise.id, set.id),
                                );
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="set-rest-detail">
                            {previousSet && (
                              <span className="mobile-prev-display">
                                이전 {previousSet.weight}kg × {previousSet.reps}
                                회
                              </span>
                            )}
                            {draft.rest?.fromSetId === set.id ? (
                              <span className="rest-live">
                                <span />
                                휴식 측정 중 <b>{duration(elapsed)}</b>
                              </span>
                            ) : set.restAfter !== null ? (
                              <span>
                                <Clock3 size={12} />
                                {set.restKind === "종료 전"
                                  ? "종료 전 대기"
                                  : set.restKind || "세트 사이 휴식"}{" "}
                                <b>{duration(set.restAfter)}</b>
                              </span>
                            ) : (
                              <span>
                                {isActive
                                  ? "운동 중 · 세트를 마치면 완료를 누르세요"
                                  : set.completed
                                    ? "휴식 미측정"
                                    : "이 세트 완료 후 휴식이 측정돼요"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <button
                      className="add-set-button"
                      onClick={() =>
                        update((d) => ({
                          ...d,
                          exercises: d.exercises.map((e) =>
                            e.id === exercise.id
                              ? {
                                  ...e,
                                  sets: [...e.sets, newSet(e.sets.at(-1))],
                                }
                              : e,
                          ),
                        }))
                      }
                    >
                      <Plus size={16} /> 세트 추가
                    </button>
                    <details className="exercise-note">
                      <summary>
                        운동 메모 <ChevronDown size={13} />
                      </summary>
                      <textarea
                        aria-label={`${exercise.name} 메모`}
                        value={exercise.note}
                        maxLength={1000}
                        placeholder="자세, 자극, 통증 등 기억할 내용을 남겨주세요."
                        onChange={(ev) =>
                          update((d) => ({
                            ...d,
                            exercises: d.exercises.map((e) =>
                              e.id === exercise.id
                                ? { ...e, note: ev.target.value }
                                : e,
                            ),
                          }))
                        }
                      />
                    </details>
                  </section>
                );
              })}
              <button
                className="add-exercise-button"
                onClick={() => setPicker(true)}
              >
                <Plus size={20} /> 운동 추가{" "}
                <span>다음 운동을 이어서 기록하세요</span>
              </button>
              <section className="session-feeling">
                <h3>오늘 운동은 어땠나요?</h3>
                <p>몸 상태를 남겨두면 다음 운동의 기준이 돼요.</p>
                <div className="feeling-options">
                  {[
                    "많이 피곤",
                    "조금 무거움",
                    "보통",
                    "좋음",
                    "아주 좋음",
                  ].map((label, i) => (
                    <button
                      key={label}
                      className={draft.condition === i + 1 ? "selected" : ""}
                      onClick={() =>
                        update((d) => ({ ...d, condition: i + 1 }))
                      }
                    >
                      <span>{["😴", "😕", "😐", "🙂", "😄"][i]}</span>
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  aria-label="오늘 운동 전체 메모"
                  placeholder="오늘의 컨디션이나 운동 강도에 대해 적어주세요."
                  value={draft.note}
                  onChange={(e) =>
                    update((d) => ({ ...d, note: e.target.value }))
                  }
                  maxLength={1000}
                />
              </section>
              <button
                className="discard-draft"
                onClick={() => {
                  if (
                    !confirm(
                      "진행 중인 임시 기록을 버릴까요? 이미 저장한 운동은 유지됩니다.",
                    )
                  )
                    return;
                  localStorage.removeItem(storage);
                  window.dispatchEvent(new Event("onfit-draft-change"));
                  onClose();
                }}
              >
                임시 기록 버리기
              </button>
            </div>
            <aside className="training-side">
              <div className={"rest-dock " + (draft.rest ? "running" : "")}>
                <div className="rest-dock-label">
                  <Clock3 size={16} />
                  <b>
                    {draft.rest
                      ? `${restKind} 휴식 측정 중`
                      : active
                        ? "세트 진행 중"
                        : "휴식 타이머"}
                  </b>
                  <span className={draft.rest ? "live-dot" : ""} />
                </div>
                <strong data-testid="rest-timer">{duration(elapsed)}</strong>
                <p>
                  {draft.rest
                    ? `${fromExercise?.name} ${fromIndex + 1}세트 완료 후`
                    : active
                      ? "운동을 마치고 세트 완료를 누르세요"
                      : "세트 완료 → 휴식 측정 → 다음 세트 시작"}
                </p>
                <div className="rest-target">
                  <span>참고 휴식 목표</span>
                  <select
                    aria-label="휴식 목표"
                    value={restGoal}
                    onChange={(e) => setRestGoal(Number(e.target.value))}
                  >
                    <option value="60">1분</option>
                    <option value="90">1분 30초</option>
                    <option value="120">2분</option>
                    <option value="180">3분</option>
                  </select>
                </div>
                {draft.rest && (
                  <div className="rest-progress">
                    <span
                      style={{
                        width: Math.min(100, (elapsed / restGoal) * 100) + "%",
                      }}
                    />
                  </div>
                )}
                {draft.rest && pending ? (
                  <button
                    className="primary next-set-button"
                    onClick={() =>
                      update((d) =>
                        startSet(d, pending.exercise.id, pending.set.id),
                      )
                    }
                  >
                    <Play size={17} />
                    {pending.exercise.id === draft.rest?.fromExerciseId
                      ? "다음 세트 시작"
                      : "다음 운동 시작"}
                    <ArrowRight size={15} />
                  </button>
                ) : draft.rest ? (
                  <button
                    className="primary next-set-button"
                    onClick={() => setPicker(true)}
                  >
                    <Plus size={17} /> 다음 운동 추가
                  </button>
                ) : active ? (
                  <button
                    className="primary next-set-button"
                    onClick={() => {
                      const e = draft.exercises.find((e) =>
                        e.sets.some((s) => s.id === active.id),
                      );
                      if (e) {
                        const next = completeSet(draft, e.id, active.id);
                        if (next === draft)
                          setError(
                            "현재 세트의 중량·횟수·RPE를 확인해 주세요.",
                          );
                        else setDraft(next);
                      }
                    }}
                  >
                    <Check size={17} /> 현재 세트 완료
                  </button>
                ) : (
                  <p className="rest-instruction">
                    각 세트 오른쪽 ✓ 버튼을 누르면
                    <br />
                    휴식 타이머가 자동으로 시작됩니다.
                  </p>
                )}
                <small>
                  다음 세트의 ‘시작’을 눌러야 실제 휴식 시간이 확정됩니다.
                  마지막 대기는 ‘종료 전 대기’로 구분해 저장합니다.
                </small>
              </div>
              <div className="session-summary">
                <span>완료한 운동 볼륨</span>
                <b>
                  {draft.exercises
                    .reduce(
                      (n, e) =>
                        n +
                        e.sets
                          .filter((s) => s.completed)
                          .reduce((sum, s) => sum + s.weight * s.reps, 0),
                      0,
                    )
                    .toLocaleString()}{" "}
                  <small>kg</small>
                </b>
                <p>
                  {finished}세트 완료 · {draft.exercises.length}개 운동
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
      {picker && (
        <div className="exercise-picker-backdrop">
          <section
            className="exercise-picker"
            role="dialog"
            aria-label="운동 선택"
          >
            <div className="picker-heading">
              <div>
                <span className="tiny-label">ADD EXERCISE</span>
                <h2>운동 추가</h2>
              </div>
              <button
                className="icon-button"
                aria-label="운동 선택 닫기"
                onClick={() => setPicker(false)}
              >
                <X size={22} />
              </button>
            </div>
            <div className="exercise-search">
              <Search size={18} />
              <input
                autoFocus
                aria-label="운동 검색"
                placeholder="운동 이름 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="exercise-categories">
              {["전체", "가슴", "등", "하체", "어깨", "팔", "코어"].map((c) => (
                <button
                  key={c}
                  className={category === c ? "selected" : ""}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="exercise-options">
              {exercises
                .filter(
                  ([name, group]) =>
                    (category === "전체" || group === category) &&
                    name
                      .replaceAll(" ", "")
                      .includes(search.replaceAll(" ", "")),
                )
                .map(([name, group]) => (
                  <button key={name} onClick={() => add(name)}>
                    <span className="exercise-option-icon">
                      <Dumbbell size={19} />
                    </span>
                    <span>
                      <b>{name}</b>
                      <small>
                        {group}
                        {history.some((w) => w.name === name)
                          ? " · 이전 기록 불러오기"
                          : ""}
                      </small>
                    </span>
                    <Plus size={19} />
                  </button>
                ))}
            </div>
            {search.trim() &&
              !exercises.some(([name]) => name === search.trim()) && (
                <button
                  className="custom-exercise"
                  onClick={() => add(search.trim())}
                >
                  <Plus size={17} /> ‘{search.trim()}’ 직접 추가
                </button>
              )}
          </section>
        </div>
      )}
    </div>
  );
}
