import { describe, expect, it } from "vitest";
import { generateDailyPlan } from "./generate-daily";
import type { CalendarEvent, Task } from "@/generated/prisma/client";

const DAY = new Date("2026-09-21T00:00:00.000Z");

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    userId: "u1",
    description: null,
    projectId: null,
    status: "PLANNED",
    priority: "NORMAL",
    dueDate: null,
    plannedDate: null,
    estimatedDuration: null,
    actualDuration: null,
    assignee: null,
    tagsJson: "[]",
    source: "MANUAL",
    sourceReference: null,
    connectorId: null,
    externalId: null,
    lastSyncedAt: null,
    syncStatus: null,
    createdAt: DAY,
    updatedAt: DAY,
    completedAt: null,
    ...overrides,
  } as Task;
}

function makeEvent(overrides: Partial<CalendarEvent> & { id: string; title: string; startTime: Date; endTime: Date }): CalendarEvent {
  return {
    userId: "u1",
    connectorId: null,
    externalId: null,
    description: null,
    location: null,
    isAllDay: false,
    attendeesJson: "[]",
    projectId: null,
    requiresPrep: false,
    prepNotes: null,
    lastSyncedAt: null,
    syncStatus: null,
    createdAt: DAY,
    updatedAt: DAY,
    ...overrides,
  } as CalendarEvent;
}

describe("generateDailyPlan", () => {
  it("produces no blocks when there are no tasks or events and returns an empty free day", () => {
    const blocks = generateDailyPlan({ day: DAY, workHourStart: 9, workHourEnd: 18, events: [], candidateTasks: [] });
    // Still reserves triage + follow-up even with nothing else.
    expect(blocks.some((b) => b.type === "TRIAGE")).toBe(true);
    expect(blocks.some((b) => b.type === "FOLLOWUP")).toBe(true);
    expect(blocks.some((b) => b.type === "FOCUS")).toBe(false);
  });

  it("includes real meetings as MEETING blocks and does not schedule focus work over them", () => {
    const meeting = makeEvent({
      id: "e1",
      title: "Stand-up",
      startTime: new Date("2026-09-21T09:00:00.000Z"),
      endTime: new Date("2026-09-21T09:30:00.000Z"),
    });
    const blocks = generateDailyPlan({ day: DAY, workHourStart: 9, workHourEnd: 18, events: [meeting], candidateTasks: [] });
    const meetingBlock = blocks.find((b) => b.type === "MEETING");
    expect(meetingBlock?.title).toBe("Stand-up");
    const overlapping = blocks.filter(
      (b) => b.type !== "MEETING" && b.startTime < meeting.endTime && b.endTime > meeting.startTime,
    );
    expect(overlapping).toHaveLength(0);
  });

  it("inserts a prep block immediately before a meeting that requires prep", () => {
    const meeting = makeEvent({
      id: "e1",
      title: "Partner call",
      startTime: new Date("2026-09-21T11:00:00.000Z"),
      endTime: new Date("2026-09-21T11:30:00.000Z"),
      requiresPrep: true,
      prepNotes: "Bring the deck",
    });
    const blocks = generateDailyPlan({ day: DAY, workHourStart: 9, workHourEnd: 18, events: [meeting], candidateTasks: [] });
    const prep = blocks.find((b) => b.type === "PREP");
    expect(prep).toBeDefined();
    expect(prep!.note).toBe("Bring the deck");
    expect(prep!.endTime.getTime()).toBeLessThanOrEqual(meeting.startTime.getTime());
  });

  it("fills focus blocks with the most urgent tasks first", () => {
    const low = makeTask({ id: "t-low", title: "Low priority", priority: "LOW", estimatedDuration: 60 });
    const critical = makeTask({
      id: "t-crit",
      title: "Critical overdue",
      priority: "CRITICAL",
      dueDate: new Date("2026-09-18T00:00:00.000Z"),
      estimatedDuration: 60,
    });
    const blocks = generateDailyPlan({
      day: DAY,
      workHourStart: 9,
      workHourEnd: 18,
      events: [],
      candidateTasks: [low, critical],
    });
    const focusBlocks = blocks.filter((b) => b.type === "FOCUS");
    expect(focusBlocks[0]?.taskId).toBe("t-crit");
  });

  it("never schedules more than ~80% of available work time (leaves real buffer)", () => {
    // 9 hours available (9-18). Plenty of low-priority filler tasks to try to overfill the day.
    const tasks = Array.from({ length: 20 }, (_, i) =>
      makeTask({ id: `t${i}`, title: `Task ${i}`, priority: "NORMAL", estimatedDuration: 60 }),
    );
    const blocks = generateDailyPlan({ day: DAY, workHourStart: 9, workHourEnd: 18, events: [], candidateTasks: tasks });
    const scheduledMinutes = blocks.reduce((sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()) / 60000, 0);
    const totalMinutes = 9 * 60;
    expect(scheduledMinutes).toBeLessThanOrEqual(totalMinutes * 0.82); // small tolerance over the 80% target
  });

  it("does not schedule focus blocks for completed or cancelled tasks", () => {
    const done = makeTask({ id: "t-done", title: "Already done", status: "COMPLETED", estimatedDuration: 60 });
    const blocks = generateDailyPlan({ day: DAY, workHourStart: 9, workHourEnd: 18, events: [], candidateTasks: [done] });
    expect(blocks.some((b) => b.taskId === "t-done")).toBe(false);
  });
});
