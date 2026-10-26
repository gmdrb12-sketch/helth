import { type Workout, type WorkoutSet, workoutSets } from "./records";
export type ExerciseDraft = {
  id: string;
  savedId?: string;
  name: string;
  sets: WorkoutSet[];
  note: string;
  legacyRest?: number;
  legacyExerciseRest?: number;
};
export type RestEvent = {
  id: string;
  fromExerciseId: string;
  fromSetId: string;
  toExerciseId?: string;
  toSetId?: string;
  kind: "세트 사이" | "운동 사이" | "종료 전";
  seconds: number;
};
export type WorkoutDraft = {
  version: 1;
  id: string;
  date: string;
  title: string;
  condition: number;
  note: string;
  exercises: ExerciseDraft[];
  rest: { fromExerciseId: string; fromSetId: string; startedAt: number } | null;
  events: RestEvent[];
  activeSetId: string | null;
  editingIds?: string[];
};
export const localDay = () => new Date().toLocaleDateString("en-CA");
const id = () => crypto.randomUUID();
export const draftKey = (userId?: string) =>
  `onfit-workout-draft:${userId || "guest"}`;
export function newDraft(date = localDay()): WorkoutDraft {
  return {
    version: 1,
    id: id(),
    date,
    title: "오늘의 운동",
    condition: 3,
    note: "",
    exercises: [],
    rest: null,
    events: [],
    activeSetId: null,
  };
}
export function newSet(
  previous?: Pick<WorkoutSet, "weight" | "reps" | "rpe">,
): WorkoutSet {
  return {
    id: id(),
    weight: previous?.weight ?? 20,
    reps: previous?.reps ?? 10,
    rpe: previous?.rpe ?? 7,
    completed: false,
    restAfter: null,
  };
}
export function addExercise(
  d: WorkoutDraft,
  name: string,
  previous?: Workout,
): WorkoutDraft {
  const prev = previous ? workoutSets(previous) : [];
  return {
    ...d,
    exercises: [
      ...d.exercises,
      {
        id: id(),
        name,
        note: "",
        sets: prev.length
          ? prev.map((s) => newSet(s))
          : [newSet(), newSet(), newSet()],
      },
    ],
  };
}
export function nextSet(
  d: WorkoutDraft,
): { exercise: ExerciseDraft; set: WorkoutSet } | null {
  for (const exercise of d.exercises) {
    const set = exercise.sets.find((s) => !s.completed);
    if (set) return { exercise, set };
  }
  return null;
}
export function completeSet(
  d: WorkoutDraft,
  exerciseId: string,
  setId: string,
  now = Date.now(),
): WorkoutDraft {
  if (d.rest || (d.activeSetId && d.activeSetId !== setId)) return d;
  const exercise = d.exercises.find((e) => e.id === exerciseId);
  const set = exercise?.sets.find((s) => s.id === setId);
  if (
    !set ||
    set.completed ||
    !Number.isFinite(set.weight) ||
    set.weight < 0 ||
    set.weight > 1000 ||
    !Number.isInteger(set.reps) ||
    set.reps < 1 ||
    set.reps > 1000 ||
    !Number.isFinite(set.rpe) ||
    set.rpe < 1 ||
    set.rpe > 10
  )
    return d;
  return {
    ...d,
    activeSetId: null,
    rest: { fromExerciseId: exerciseId, fromSetId: setId, startedAt: now },
    exercises: d.exercises.map((e) =>
      e.id === exerciseId
        ? {
            ...e,
            sets: e.sets.map((s) =>
              s.id === setId ? { ...s, completed: true } : s,
            ),
          }
        : e,
    ),
  };
}
export function startSet(
  d: WorkoutDraft,
  exerciseId: string,
  setId: string,
  now = Date.now(),
): WorkoutDraft {
  const target = d.exercises
    .find((e) => e.id === exerciseId)
    ?.sets.find((s) => s.id === setId);
  if (!target || target.completed || (d.activeSetId && d.activeSetId !== setId))
    return d;
  if (!d.rest) return { ...d, activeSetId: setId };
  return { ...endRest(d, exerciseId, setId, now), activeSetId: setId };
}
function endRest(
  d: WorkoutDraft,
  toExerciseId: string | undefined,
  toSetId: string | undefined,
  now: number,
): WorkoutDraft {
  if (!d.rest) return d;
  const { fromExerciseId, fromSetId, startedAt } = d.rest;
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const kind = !toExerciseId
    ? "종료 전"
    : toExerciseId === fromExerciseId
      ? "세트 사이"
      : "운동 사이";
  const event: RestEvent = {
    id: id(),
    fromExerciseId,
    fromSetId,
    toExerciseId,
    toSetId,
    kind,
    seconds,
  };
  return {
    ...d,
    rest: null,
    events: [...d.events, event],
    exercises: d.exercises.map((e) =>
      e.id === fromExerciseId
        ? {
            ...e,
            sets: e.sets.map((s) =>
              s.id === fromSetId
                ? { ...s, restAfter: seconds, restKind: kind }
                : s,
            ),
          }
        : e,
    ),
  };
}
export function deleteSet(
  d: WorkoutDraft,
  exerciseId: string,
  setId: string,
): WorkoutDraft {
  return {
    ...d,
    rest: d.rest?.fromSetId === setId ? null : d.rest,
    activeSetId: d.activeSetId === setId ? null : d.activeSetId,
    events: d.events.filter((e) => e.fromSetId !== setId),
    exercises: d.exercises.map((e) =>
      e.id === exerciseId
        ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
        : e,
    ),
  };
}
export function saveWorkout(d: WorkoutDraft, now = Date.now()): Workout[] {
  const finished = endRest(d, undefined, undefined, now);
  return finished.exercises
    .filter((e) => e.sets.some((s) => s.completed))
    .map((e) => {
      const sets = e.sets.filter((s) => s.completed);
      const events = finished.events.filter((ev) => ev.fromExerciseId === e.id);
      return {
        id: e.savedId || `${d.id}-${e.id}`,
        sessionId: d.id,
        sessionName: d.title,
        date: d.date,
        name: e.name,
        weight: sets[0].weight,
        reps: sets[0].reps,
        sets: sets.length,
        rpe: Number(
          (sets.reduce((sum, s) => sum + s.rpe, 0) / sets.length).toFixed(1),
        ),
        condition: d.condition,
        note: [e.note, d.note].filter(Boolean).join("\n"),
        setDetails: sets,
        rest:
          (e.legacyRest || 0) +
          events
            .filter((ev) => ev.kind !== "종료 전")
            .reduce((sum, ev) => sum + ev.seconds, 0),
        exerciseRest:
          (e.legacyExerciseRest || 0) +
          events
            .filter((ev) => ev.kind === "운동 사이")
            .reduce((sum, ev) => sum + ev.seconds, 0),
        restEvents: [
          ...(e.legacyRest
            ? [{ kind: "기존 누적 휴식", seconds: e.legacyRest }]
            : []),
          ...events.map((ev) => ({ ...ev })),
        ],
      };
    });
}
export function fromRecords(
  records: Workout[],
  repeat = false,
  date = localDay(),
): WorkoutDraft {
  const first = records[0];
  const d = newDraft(repeat ? date : first.date);
  d.title = first.sessionName || "나의 운동";
  d.condition = repeat ? 3 : first.condition;
  d.id = repeat ? d.id : first.sessionId || first.id;
  d.editingIds = repeat ? undefined : records.map((r) => r.id);
  d.exercises = records.map((r) => ({
    id: id(),
    savedId: repeat ? undefined : r.id,
    name: r.name,
    note: repeat ? "" : r.note,
    legacyRest: !repeat
      ? Math.max(
          0,
          r.rest -
            workoutSets(r)
              .filter((s) => s.restAfter !== null && s.restKind !== "종료 전")
              .reduce((sum, s) => sum + (s.restAfter || 0), 0),
        )
      : undefined,
    legacyExerciseRest: !repeat
      ? Math.max(
          0,
          (r.exerciseRest || 0) -
            workoutSets(r)
              .filter((s) => s.restKind === "운동 사이")
              .reduce((sum, s) => sum + (s.restAfter || 0), 0),
        )
      : undefined,
    sets: workoutSets(r).map((s) => (repeat ? newSet(s) : { ...s })),
  }));
  // Preserve measured per-set rests while editing; do not invent timing for legacy records.
  if (!repeat)
    d.events = d.exercises.flatMap((e) =>
      e.sets
        .filter((s) => s.restAfter !== null)
        .map((s) => ({
          id: id(),
          fromExerciseId: e.id,
          fromSetId: s.id,
          kind: s.restKind || "세트 사이",
          seconds: s.restAfter!,
        })),
    );
  return d;
}
export function validDraft(value: unknown): value is WorkoutDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as WorkoutDraft;
  return (
    d.version === 1 &&
    typeof d.id === "string" &&
    typeof d.date === "string" &&
    typeof d.title === "string" &&
    Array.isArray(d.exercises) &&
    Array.isArray(d.events) &&
    typeof d.condition === "number" &&
    typeof d.note === "string" &&
    d.exercises.every(
      (e) =>
        typeof e.id === "string" &&
        typeof e.name === "string" &&
        typeof e.note === "string" &&
        Array.isArray(e.sets) &&
        e.sets.every(
          (s) =>
            typeof s.id === "string" &&
            typeof s.completed === "boolean" &&
            [s.weight, s.reps, s.rpe].every(
              (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
            ) &&
            (s.restAfter === null ||
              (typeof s.restAfter === "number" &&
                Number.isFinite(s.restAfter) &&
                s.restAfter >= 0)),
        ),
    ) &&
    (d.rest === null ||
      (typeof d.rest === "object" &&
        typeof d.rest.fromSetId === "string" &&
        typeof d.rest.fromExerciseId === "string" &&
        Number.isFinite(d.rest.startedAt)))
  );
}
export const exercises = [
  ["벤치프레스", "가슴"],
  ["인클라인 덤벨프레스", "가슴"],
  ["체스트프레스", "가슴"],
  ["케이블 플라이", "가슴"],
  ["푸시업", "가슴"],
  ["랫풀다운", "등"],
  ["시티드 케이블 로우", "등"],
  ["바벨 로우", "등"],
  ["풀업", "등"],
  ["데드리프트", "등"],
  ["스쿼트", "하체"],
  ["레그프레스", "하체"],
  ["레그 익스텐션", "하체"],
  ["레그 컬", "하체"],
  ["런지", "하체"],
  ["힙 쓰러스트", "하체"],
  ["오버헤드프레스", "어깨"],
  ["사이드 레터럴 레이즈", "어깨"],
  ["리버스 펙덱", "어깨"],
  ["바벨 컬", "팔"],
  ["덤벨 컬", "팔"],
  ["케이블 푸시다운", "팔"],
  ["트라이셉스 익스텐션", "팔"],
  ["크런치", "코어"],
  ["행잉 레그레이즈", "코어"],
] as const;
