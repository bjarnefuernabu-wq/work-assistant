import type { Priority, Task } from "@/generated/prisma/client";

// Attention scoring — used by the dashboard's "what needs my attention" ordering and by
// project pages picking a "next recommended action". Higher score = more urgent. This is a
// tuned heuristic, not a hard architectural contract; adjust weights here as needed.

const PRIORITY_WEIGHT: Record<Priority, number> = {
  CRITICAL: 40,
  HIGH: 25,
  NORMAL: 10,
  LOW: 0,
};

export function taskUrgencyScore(task: Pick<Task, "priority" | "dueDate" | "plannedDate" | "status">, now = new Date()): number {
  if (task.status === "COMPLETED" || task.status === "CANCELLED") return -Infinity;

  let score = PRIORITY_WEIGHT[task.priority];

  if (task.dueDate) {
    const daysUntilDue = (new Date(task.dueDate).getTime() - now.getTime()) / 86_400_000;
    if (daysUntilDue < 0) {
      // overdue — the more overdue, the more urgent, capped so it doesn't dwarf everything
      score += 60 + Math.min(-daysUntilDue, 14) * 2;
    } else if (daysUntilDue < 1) {
      score += 35;
    } else if (daysUntilDue < 3) {
      score += 22;
    } else if (daysUntilDue < 7) {
      score += 10;
    }
  }

  if (task.plannedDate) {
    const daysUntilPlanned = (new Date(task.plannedDate).getTime() - now.getTime()) / 86_400_000;
    if (daysUntilPlanned < 1 && daysUntilPlanned > -1) score += 8; // planned for today
  }

  if (task.status === "WAITING") score -= 15; // blocked work is not "next" work

  return score;
}

export function sortByUrgency<T extends Pick<Task, "priority" | "dueDate" | "plannedDate" | "status">>(
  tasks: T[],
  now = new Date(),
): T[] {
  return [...tasks].sort((a, b) => taskUrgencyScore(b, now) - taskUrgencyScore(a, now));
}

export function waitingItemAgeDays(since: Date, now = new Date()): number {
  return Math.floor((now.getTime() - new Date(since).getTime()) / 86_400_000);
}
