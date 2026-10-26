"use client";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  duration,
  workoutSets,
  workoutVolume,
  type Workout,
} from "../lib/records";
import { localDay } from "../lib/workout";
type Props = {
  workouts: Workout[];
  hasDraft: boolean;
  onStart: (date: string, records?: Workout[], repeat?: boolean) => void;
  onDelete: (ids: string[]) => void;
};
function groups(workouts: Workout[]) {
  const map = new Map<string, Workout[]>();
  for (const w of workouts) {
    const id = w.sessionId || w.id;
    map.set(id, [...(map.get(id) || []), w]);
  }
  return [...map.values()];
}
export default function WorkoutJournal({
  workouts,
  hasDraft,
  onStart,
  onDelete,
}: Props) {
  const [selected, setSelected] = useState(localDay());
  const date = new Date(selected + "T12:00:00");
  const weekday = (date.getDay() + 6) % 7;
  const sessions = groups(workouts.filter((w) => w.date === selected));
  const allSessions = groups(workouts).sort((a, b) =>
    b[0].date.localeCompare(a[0].date),
  );
  const previous = allSessions[0];
  const volume = workouts
    .filter((w) => w.date === selected)
    .reduce((n, w) => n + workoutVolume(w), 0);
  const setCount = workouts
    .filter((w) => w.date === selected)
    .reduce((n, w) => n + workoutSets(w).length, 0);
  const changeWeek = (n: number) => {
    const d = new Date(selected + "T12:00:00");
    d.setDate(d.getDate() + n * 7);
    setSelected(d.toLocaleDateString("en-CA"));
  };
  return (
    <div className="journal">
      <div className="journal-top">
        <div className="journal-date">
          <span>TRAINING LOG</span>
          <h2>
            {date.getFullYear()}년 {date.getMonth() + 1}월{" "}
            <small>나의 운동일지</small>
          </h2>
        </div>
        <div className="journal-actions">
          <button
            className="outline-button"
            onClick={() => setSelected(localDay())}
          >
            오늘
          </button>
          <label className="journal-date-input">
            <CalendarDays size={17} />
            <input
              aria-label="기록 날짜 선택"
              type="date"
              value={selected}
              onChange={(e) => {
                if (e.target.value) setSelected(e.target.value);
              }}
            />
          </label>
        </div>
      </div>
      <div className="journal-week">
        <button
          className="week-arrow"
          aria-label="이전 주"
          onClick={() => changeWeek(-1)}
        >
          <ChevronLeft size={19} />
        </button>
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(selected + "T12:00:00");
          d.setDate(d.getDate() - weekday + i);
          const key = d.toLocaleDateString("en-CA");
          const done = workouts.some((w) => w.date === key);
          return (
            <button
              key={key}
              className={
                "journal-day " +
                (key === selected ? "selected " : "") +
                (key === localDay() ? "is-today" : "")
              }
              onClick={() => setSelected(key)}
            >
              <span>{["월", "화", "수", "목", "금", "토", "일"][i]}</span>
              <b>{d.getDate()}</b>
              <span className={done ? "recorded-dot" : "day-placeholder"}>
                {done ? <Check size={11} /> : key === localDay() ? "오늘" : ""}
              </span>
            </button>
          );
        })}
        <button
          className="week-arrow"
          aria-label="다음 주"
          onClick={() => changeWeek(1)}
        >
          <ChevronRight size={19} />
        </button>
      </div>
      <div className="journal-start">
        <div>
          <span className="start-icon">
            <Dumbbell size={24} />
          </span>
          <div>
            <b>
              {hasDraft
                ? "진행 중인 운동이 있어요"
                : "오늘의 운동을 기록해 볼까요?"}
            </b>
            <p>
              {hasDraft
                ? "입력한 세트와 휴식 타이머를 이어서 기록하세요."
                : "운동을 고르고, 세트마다 무게와 횟수를 남기세요."}
            </p>
          </div>
        </div>
        <button className="primary" onClick={() => onStart(selected)}>
          <Play size={17} />
          {hasDraft ? "운동 이어하기" : "운동 시작"}
        </button>
      </div>
      {previous && !hasDraft && (
        <button
          className="repeat-session"
          onClick={() => onStart(selected, previous, true)}
        >
          <RotateCcw size={17} />
          <span>
            최근 운동 불러오기{" "}
            <small>
              {previous[0].date} ·{" "}
              {previous
                .slice(0, 2)
                .map((w) => w.name)
                .join(", ")}
              {previous.length > 2 ? ` 외 ${previous.length - 2}개` : ""}
            </small>
          </span>
          <ArrowRight size={18} />
        </button>
      )}
      <div className="journal-log-heading">
        <h3>
          {selected === localDay()
            ? "오늘"
            : `${date.getMonth() + 1}월 ${date.getDate()}일`}
          의 운동
        </h3>
        <span>
          {sessions.length}회 운동 · {setCount}세트 · {volume.toLocaleString()}
          kg 볼륨
        </span>
      </div>
      {!sessions.length ? (
        <section className="journal-empty">
          <span>
            <CalendarDays size={31} />
          </span>
          <h3>아직 기록한 운동이 없어요</h3>
          <p>
            한 세트씩 쌓이는 기록이
            <br />
            다음 운동의 기준이 됩니다.
          </p>
          <button className="text-button" onClick={() => onStart(selected)}>
            첫 운동 기록하기 <ArrowRight size={16} />
          </button>
        </section>
      ) : (
        sessions.map((records, index) => {
          const first = records[0];
          const rest = records.reduce((n, w) => n + w.rest, 0);
          return (
            <section
              className="journal-session"
              key={first.sessionId || first.id}
            >
              <div className="session-card-heading">
                <div>
                  <span className="tiny-label">
                    WORKOUT {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{first.sessionName || "운동 기록"}</h3>
                </div>
                <button
                  className="icon-button"
                  aria-label="운동 기록 수정"
                  onClick={() => onStart(selected, records, false)}
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="운동 기록 삭제"
                  onClick={() => {
                    if (
                      confirm("이 운동의 모든 세트와 휴식 기록을 삭제할까요?")
                    )
                      onDelete(records.map((w) => w.id));
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="session-tags">
                <span>
                  <Dumbbell size={13} />
                  {records.length}개 운동 ·{" "}
                  {records.reduce((n, w) => n + w.sets, 0)}세트
                </span>
                <span>
                  <Clock3 size={13} />
                  세트·운동 사이 휴식 {duration(rest)}
                </span>
                <span>
                  {["", "😴", "😕", "😐", "🙂", "😄"][first.condition]} 컨디션{" "}
                  {first.condition}/5
                </span>
              </div>
              {records.map((w) => (
                <div className="logged-exercise" key={w.id}>
                  <div className="logged-exercise-title">
                    <span />
                    <h4>{w.name}</h4>
                    <b>
                      {workoutVolume(w).toLocaleString()} <small>kg 볼륨</small>
                    </b>
                  </div>
                  {!w.setDetails && (
                    <p className="legacy-hint">
                      기존 일괄 기록 · 당시 세트별 중량과 휴식은 따로 기록되지
                      않았어요.
                    </p>
                  )}
                  <div className="logged-set-table">
                    <div className="logged-set-head">
                      <span>세트</span>
                      <span>중량</span>
                      <span>횟수</span>
                      <span>RPE</span>
                      <span>완료 후 휴식</span>
                    </div>
                    {workoutSets(w).map((s, i) => (
                      <div className="logged-set" key={s.id}>
                        <span>{i + 1}</span>
                        <b>
                          {s.weight}
                          <small> kg</small>
                        </b>
                        <b>
                          {s.reps}
                          <small> 회</small>
                        </b>
                        <span>{s.rpe}</span>
                        <span className="logged-rest">
                          {s.restAfter !== null ? (
                            <>
                              <Clock3 size={12} />
                              <b>{duration(s.restAfter)}</b>
                              <small>
                                {s.restKind === "종료 전"
                                  ? "종료 전 대기"
                                  : s.restKind === "운동 사이"
                                    ? "다음 운동까지"
                                    : "다음 세트까지"}
                              </small>
                            </>
                          ) : (
                            <small>미측정</small>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {(w.exerciseRest || 0) > 0 && (
                    <div className="exercise-rest-summary">
                      <Clock3 size={13} />
                      다음 운동까지 쉰 시간 <b>{duration(w.exerciseRest!)}</b>
                    </div>
                  )}
                  {!w.setDetails && w.rest > 0 && (
                    <p className="legacy-rest">
                      기존 누적 휴식 {duration(w.rest)} · 세트별 배분 정보 없음
                    </p>
                  )}
                  {w.note && <p className="logged-note">{w.note}</p>}
                </div>
              ))}
            </section>
          );
        })
      )}
      <div className="journal-rest-guide">
        <Clock3 size={17} />
        <p>
          <b>휴식 시간은 이렇게 남아요</b>
          <span>
            세트 완료 → 자동 측정 → 다음 세트 시작 시 확정. 운동을 바꾸면 운동
            사이 휴식으로 구분됩니다.
          </span>
        </p>
      </div>
    </div>
  );
}
