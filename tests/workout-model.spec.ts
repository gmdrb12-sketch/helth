import { test, expect } from "@playwright/test";
import {
  addExercise,
  completeSet,
  deleteSet,
  fromRecords,
  newDraft,
  newSet,
  saveWorkout,
  startSet,
  validDraft,
} from "../lib/workout";
import { isData, workoutVolume, type Workout } from "../lib/records";
function setup() {
  return addExercise(newDraft("2026-10-27"), "벤치프레스");
}
test("세트별 서로 다른 중량·횟수·휴식을 저장하고 실제 볼륨을 계산한다", () => {
  let d = setup();
  const e = d.exercises[0];
  e.sets[0].weight = 20;
  e.sets[0].reps = 12;
  e.sets[1].weight = 40;
  e.sets[1].reps = 10;
  e.sets[2].weight = 60;
  e.sets[2].reps = 8;
  d = completeSet(d, e.id, e.sets[0].id, 1000);
  d = startSet(d, e.id, e.sets[1].id, 91000);
  d = completeSet(d, e.id, e.sets[1].id, 101000);
  d = startSet(d, e.id, e.sets[2].id, 161000);
  d = completeSet(d, e.id, e.sets[2].id, 181000);
  const [w] = saveWorkout(d, 211000);
  expect(workoutVolume(w)).toBe(1120);
  expect(w.setDetails?.map((s) => s.weight)).toEqual([20, 40, 60]);
  expect(w.setDetails?.map((s) => s.restAfter)).toEqual([90, 60, 30]);
  expect(w.setDetails?.[2].restKind).toBe("종료 전");
  expect(w.rest).toBe(150);
  expect(w.sets).toBe(3);
  expect(isData({ workouts: [w], meals: [], body: [], goal: "" })).toBe(true);
});
test("운동 사이 휴식을 세트 사이 휴식과 구분한다", () => {
  let d = addExercise(setup(), "랫풀다운");
  const a = d.exercises[0],
    b = d.exercises[1];
  d = completeSet(d, a.id, a.sets[0].id, 1000);
  d = startSet(d, b.id, b.sets[0].id, 121000);
  d = completeSet(d, b.id, b.sets[0].id, 130000);
  const records = saveWorkout(d, 131000);
  expect(records).toHaveLength(2);
  expect(records[0].exerciseRest).toBe(120);
  expect(records[0].setDetails?.[0].restKind).toBe("운동 사이");
  expect(records[1].sets).toBe(1);
});
test("세트 추가는 마지막 중량을 복사하되 완료·휴식은 복사하지 않는다", () => {
  const s = newSet({ weight: 70, reps: 8, rpe: 9 });
  expect(s.weight).toBe(70);
  expect(s.completed).toBe(false);
  expect(s.restAfter).toBeNull();
});
test("휴식 중 중복 완료를 막고 다음 세트를 시작해야 측정이 확정된다", () => {
  let d = setup();
  const e = d.exercises[0];
  d = completeSet(d, e.id, e.sets[0].id, 1000);
  expect(completeSet(d, e.id, e.sets[0].id, 2000)).toBe(d);
  expect(completeSet(d, e.id, e.sets[1].id, 3000)).toBe(d);
  d = startSet(d, e.id, e.sets[1].id, 61000);
  expect(d.exercises[0].sets[0].restAfter).toBe(60);
  expect(d.rest).toBeNull();
  expect(d.activeSetId).toBe(e.sets[1].id);
});
test("진행 중 초안을 JSON 복원해도 실제 시각으로 휴식을 계산한다", () => {
  let d = setup();
  const e = d.exercises[0];
  d = completeSet(d, e.id, e.sets[0].id, 1000);
  d = JSON.parse(JSON.stringify(d));
  expect(validDraft(d)).toBe(true);
  d = startSet(d, e.id, e.sets[1].id, 181000);
  expect(d.exercises[0].sets[0].restAfter).toBe(180);
});
test("완료 세트 삭제 시 해당 휴식과 진행 상태를 정리한다", () => {
  let d = setup();
  const e = d.exercises[0];
  d = completeSet(d, e.id, e.sets[0].id, 1000);
  d = deleteSet(d, e.id, e.sets[0].id);
  expect(d.rest).toBeNull();
  expect(d.exercises[0].sets).toHaveLength(2);
  expect(saveWorkout(d)).toHaveLength(0);
});
test("기존 일괄 기록은 읽을 수 있고 편집해도 누적 휴식이 사라지지 않는다", () => {
  const legacy: Workout = {
    id: "old",
    date: "2026-10-25",
    name: "벤치프레스",
    weight: 30,
    reps: 10,
    sets: 3,
    rest: 180,
    exerciseRest: 30,
    rpe: 7,
    condition: 3,
    note: "이전 기록",
  };
  expect(workoutVolume(legacy)).toBe(900);
  const d = fromRecords([legacy]);
  const [saved] = saveWorkout(d);
  expect(saved.rest).toBe(180);
  expect(saved.exerciseRest).toBe(30);
  expect(saved.setDetails?.every((s) => s.restAfter === null)).toBe(true);
  expect(saveWorkout(fromRecords([saved]))[0].rest).toBe(180);
});
test("반복 운동은 이전 중량만 불러오고 완료 여부와 휴식 측정은 새로 시작한다", () => {
  let d = setup();
  const e = d.exercises[0];
  d = completeSet(d, e.id, e.sets[0].id, 1000);
  const old = saveWorkout(d, 2000);
  const repeat = fromRecords(old, true, "2026-10-28");
  expect(repeat.id).not.toBe(old[0].sessionId);
  expect(repeat.exercises[0].sets[0].completed).toBe(false);
  expect(repeat.exercises[0].sets[0].restAfter).toBeNull();
  expect(repeat.date).toBe("2026-10-28");
});

test("운동 사진은 실제 종목 ID에 연결되고 커스텀 이름을 임의의 다른 사진에 매핑하지 않는다", async () => {
  const images = JSON.parse(
    await (
      await import("node:fs/promises")
    ).readFile(process.cwd() + "/lib/exercise-images.json", "utf8"),
  );
  expect(images["케이블 시티드 로우"].id).toBe("Seated_Cable_Rows");
  expect(images["랫풀다운"].id).toBe("Wide-Grip_Lat_Pulldown");
  expect(images["벤치프레스"].id).toBe("Barbell_Bench_Press_-_Medium_Grip");
  expect(Object.hasOwn(images, "어시스트 머신 풀업")).toBe(false);
});

test("게스트 가져오기는 기존 계정의 목표와 같은 ID의 기록을 덮어쓰지 않는다", async () => {
  const { mergeGuestRecords } = await import("../lib/pending-records");
  const account = {
    workouts: [],
    meals: [
      {
        id: "same",
        date: "2026-10-27",
        name: "계정 기록",
        type: "점심",
        calories: 600,
        protein: 30,
      },
    ],
    body: [],
    goal: "내가 정한 기존 목표",
  };
  const guest = {
    ...account,
    goal: "게스트 목표",
    meals: [
      { ...account.meals[0], name: "게스트의 예전 기록" },
      { ...account.meals[0], id: "new", name: "새 기록" },
    ],
  };
  const merged = mergeGuestRecords(account, guest);
  expect(merged.meals).toHaveLength(2);
  expect(merged.meals[0].name).toBe("계정 기록");
  expect(merged.goal).toBe("내가 정한 기존 목표");
});

test("과거 게스트 측정값을 가져와도 최근 인바디 기록은 날짜순으로 유지한다", async () => {
  const { mergeGuestRecords } = await import("../lib/pending-records");
  const base = { workouts: [], meals: [], goal: "목표" };
  const result = mergeGuestRecords(
    {
      ...base,
      body: [
        { id: "latest", date: "2026-10-27", weight: 70, muscle: 30, fat: 20 },
      ],
    },
    {
      ...base,
      body: [
        { id: "old", date: "2026-09-01", weight: 75, muscle: 29, fat: 24 },
      ],
    },
  );
  expect(result.body.at(-1)?.id).toBe("latest");
});
