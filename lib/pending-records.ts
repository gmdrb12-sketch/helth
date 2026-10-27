import { empty, isData, type Data } from "./records";
export type PendingRecords = { data: Data; revision: number };
export const pendingKey = (userId: string) => `onfit-pending-records:${userId}`;
export function readPending(userId: string): PendingRecords | null {
  try {
    const p = JSON.parse(localStorage.getItem(pendingKey(userId)) || "null");
    return p && isData(p.data) && Number.isFinite(p.revision) && p.revision >= 0
      ? p
      : null;
  } catch {
    return null;
  }
}
export function writePending(userId: string, data: Data, revision: number) {
  localStorage.setItem(pendingKey(userId), JSON.stringify({ data, revision }));
}
export function acknowledgePending(
  userId: string,
  serialized: string,
  revision: number,
) {
  const pending = readPending(userId);
  if (!pending) return;
  if (JSON.stringify(pending.data) === serialized)
    localStorage.removeItem(pendingKey(userId));
  else writePending(userId, pending.data, revision);
}
export function mergeGuestRecords(account: Data, guest: Data): Data {
  const unique = <T extends { id: string; date: string }>(a: T[], b: T[]) =>
    [
      ...a,
      ...b.filter((item) => !a.some((existing) => existing.id === item.id)),
    ].sort((left, right) => left.date.localeCompare(right.date));
  return {
    workouts: unique(account.workouts, guest.workouts),
    meals: unique(account.meals, guest.meals),
    body: unique(account.body, guest.body),
    goal:
      account.goal && account.goal !== empty.goal
        ? account.goal
        : guest.goal || account.goal,
  };
}
