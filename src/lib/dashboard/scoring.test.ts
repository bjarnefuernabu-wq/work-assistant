import { describe, expect, it } from "vitest";
import { taskUrgencyScore, sortByUrgency, waitingItemAgeDays } from "./scoring";
import type { Task } from "@/generated/prisma/client";

function task(overrides: Partial<Task>): Pick<Task, "priority" | "dueDate" | "plannedDate" | "status"> {
  return {
    priority: "NORMAL",
    dueDate: null,
    plannedDate: null,
    status: "PLANNED",
    ...overrides,
  };
}

const NOW = new Date("2026-09-21T12:00:00.000Z");

describe("taskUrgencyScore", () => {
  it("scores completed and cancelled tasks as -Infinity so they never surface", () => {
    expect(taskUrgencyScore(task({ status: "COMPLETED" }), NOW)).toBe(-Infinity);
    expect(taskUrgencyScore(task({ status: "CANCELLED" }), NOW)).toBe(-Infinity);
  });

  it("scores overdue tasks higher than tasks due later", () => {
    const overdue = task({ dueDate: new Date("2026-09-18T00:00:00.000Z") });
    const dueSoon = task({ dueDate: new Date("2026-09-23T00:00:00.000Z") });
    expect(taskUrgencyScore(overdue, NOW)).toBeGreaterThan(taskUrgencyScore(dueSoon, NOW));
  });

  it("scores higher priority above lower priority, all else equal", () => {
    const critical = task({ priority: "CRITICAL" });
    const low = task({ priority: "LOW" });
    expect(taskUrgencyScore(critical, NOW)).toBeGreaterThan(taskUrgencyScore(low, NOW));
  });

  it("penalizes WAITING status since blocked work is not 'next' work", () => {
    const waiting = task({ status: "WAITING", priority: "HIGH" });
    const planned = task({ status: "PLANNED", priority: "HIGH" });
    expect(taskUrgencyScore(waiting, NOW)).toBeLessThan(taskUrgencyScore(planned, NOW));
  });

  it("caps the overdue bonus at 14 days so a task overdue by a year scores the same as one overdue by a month", () => {
    // Both are well past the 14-day cap in taskUrgencyScore, so they should score identically.
    const overdueYear = task({ dueDate: new Date("2025-09-21T00:00:00.000Z"), priority: "LOW" });
    const overdueMonth = task({ dueDate: new Date("2026-08-21T00:00:00.000Z"), priority: "LOW" });
    expect(taskUrgencyScore(overdueYear, NOW)).toBe(taskUrgencyScore(overdueMonth, NOW));
  });
});

describe("sortByUrgency", () => {
  it("sorts descending by urgency and excludes nothing (caller filters completed separately)", () => {
    const tasks = [
      task({ priority: "LOW" }),
      task({ priority: "CRITICAL", dueDate: new Date("2026-09-18T00:00:00.000Z") }),
      task({ priority: "NORMAL" }),
    ];
    const sorted = sortByUrgency(tasks, NOW);
    expect(sorted[0].priority).toBe("CRITICAL");
  });
});

describe("waitingItemAgeDays", () => {
  it("computes whole days elapsed", () => {
    expect(waitingItemAgeDays(new Date("2026-09-13T12:00:00.000Z"), NOW)).toBe(8);
  });

  it("returns 0 for something started today", () => {
    expect(waitingItemAgeDays(new Date("2026-09-21T00:00:00.000Z"), NOW)).toBe(0);
  });
});
