import { describe, expect, it } from "vitest";
import { startOfWeek } from "date-fns";
import { generateWeeklyPlan } from "./generate-weekly";
import type { CalendarEvent, Priority, Task } from "@/generated/prisma/client";

const TODAY = new Date("2026-09-21T12:00:00.000Z"); // a Monday
const WEEK_START = startOfWeek(TODAY, { weekStartsOn: 1 });

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task & { project?: { priority: Priority } | null } {
  return {
    userId: "u1",
    description: null,
    projectId: null,
    status: "PLANNED",
    priority: "NORMAL",
    dueDate: null,
    plannedDate: null,
    estimatedDuration: 60,
    actualDuration: null,
    assignee: null,
    tagsJson: "[]",
    source: "MANUAL",
    sourceReference: null,
    connectorId: null,
    externalId: null,
    lastSyncedAt: null,
    syncStatus: null,
    createdAt: TODAY,
    updatedAt: TODAY,
    completedAt: null,
    project: null,
    ...overrides,
  } as Task;
}

function makeEvent(overrides: Partial<CalendarEvent> & { id: string; startTime: Date; endTime: Date }): CalendarEvent {
  return {
    userId: "u1",
    connectorId: null,
    externalId: null,
    title: "Busy block",
    description: null,
    location: null,
    isAllDay: false,
    attendeesJson: "[]",
    projectId: null,
    requiresPrep: false,
    prepNotes: null,
    lastSyncedAt: null,
    syncStatus: null,
    createdAt: TODAY,
    updatedAt: TODAY,
    ...overrides,
  } as CalendarEvent;
}

describe("generateWeeklyPlan", () => {
  it("assigns an unplanned task to the earliest day with room", () => {
    const t = makeTask({ id: "t1", title: "Do the thing", estimatedDuration: 60 });
    const result = generateWeeklyPlan({
      weekStart: WEEK_START,
      workHourStart: 9,
      workHourEnd: 18,
      events: [],
      openTasks: [t],
      today: TODAY,
    });
    expect(result.proposedAssignments).toHaveLength(1);
    expect(result.proposedAssignments[0].taskId).toBe("t1");
  });

  it("places an already-overdue task on the earliest available day, not excluded for being 'past its deadline'", () => {
    const overdue = makeTask({
      id: "t-overdue",
      title: "Overdue critical thing",
      priority: "CRITICAL",
      dueDate: new Date("2026-09-19T00:00:00.000Z"), // 2 days before "today"
      estimatedDuration: 30,
    });
    const result = generateWeeklyPlan({
      weekStart: WEEK_START,
      workHourStart: 9,
      workHourEnd: 18,
      events: [],
      openTasks: [overdue],
      today: TODAY,
    });
    expect(result.proposedAssignments.map((a) => a.taskId)).toContain("t-overdue");
    expect(result.unscheduledImportant.map((u) => u.taskId)).not.toContain("t-overdue");
  });

  it("respects an upcoming deadline — never proposes scheduling a task after its due date", () => {
    const t = makeTask({
      id: "t-deadline",
      title: "Due Tuesday",
      // Tuesday noon, well clear of the UTC/local day-boundary ambiguity a 23:59 deadline
      // would create against the (local-time) day buckets generateWeeklyPlan builds.
      dueDate: new Date(WEEK_START.getTime() + 1 * 86_400_000 + 12 * 3_600_000),
      estimatedDuration: 60,
    });
    // Fill Monday and Tuesday with meetings so there's no room until Wednesday, which is past
    // the deadline — the task should be flagged as a deadline risk, not silently scheduled late.
    const busyEvents = [0, 1].map((offset) =>
      makeEvent({
        id: `evt${offset}`,
        startTime: new Date(WEEK_START.getTime() + offset * 86_400_000 + 9 * 3_600_000),
        endTime: new Date(WEEK_START.getTime() + offset * 86_400_000 + 18 * 3_600_000),
      }),
    );

    const result = generateWeeklyPlan({
      weekStart: WEEK_START,
      workHourStart: 9,
      workHourEnd: 18,
      events: busyEvents,
      openTasks: [t],
      today: TODAY,
    });
    expect(result.proposedAssignments.map((a) => a.taskId)).not.toContain("t-deadline");
    expect(result.deadlineRisks.map((r) => r.taskId)).toContain("t-deadline");
  });

  it("flags a high/critical priority task that doesn't fit anywhere this week as unscheduled-important", () => {
    // 6 huge tasks (8h each) can't all fit in a 5-day week at ~75% daily capacity.
    const bigTasks = Array.from({ length: 6 }, (_, i) =>
      makeTask({ id: `big${i}`, title: `Big task ${i}`, priority: "HIGH", estimatedDuration: 8 * 60 }),
    );
    const result = generateWeeklyPlan({
      weekStart: WEEK_START,
      workHourStart: 9,
      workHourEnd: 18,
      events: [],
      openTasks: bigTasks,
      today: TODAY,
    });
    expect(result.unscheduledImportant.length).toBeGreaterThan(0);
  });

  it("marks a day overloaded when already-planned work exceeds capacity", () => {
    const alreadyPlanned = makeTask({
      id: "t-planned",
      title: "Huge task",
      plannedDate: WEEK_START,
      estimatedDuration: 12 * 60, // 12 hours, way over any realistic daily capacity
    });
    const result = generateWeeklyPlan({
      weekStart: WEEK_START,
      workHourStart: 9,
      workHourEnd: 18,
      events: [],
      openTasks: [alreadyPlanned],
      today: TODAY,
    });
    expect(result.days[0].overloaded).toBe(true);
  });
});
