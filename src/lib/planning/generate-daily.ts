import { taskUrgencyScore } from "@/lib/dashboard/scoring";
import type { CalendarEvent, Task } from "@/generated/prisma/client";
import type { PlanBlockType } from "@/generated/prisma/enums";

export interface GeneratedBlock {
  startTime: Date;
  endTime: Date;
  type: PlanBlockType;
  title: string;
  taskId?: string;
  note?: string;
}

interface Slot {
  start: Date;
  end: Date;
}

const TRIAGE_MINUTES = 20;
const FOLLOWUP_MINUTES = 20;
const PREP_MINUTES = 20;
const DEFAULT_TASK_MINUTES = 45;
const TARGET_LOAD_FRACTION = 0.75; // aim for ~75% of free time scheduled, per the 70-80% rule
const MAX_LOAD_FRACTION = 0.8;

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / 60_000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function slotTimes(slot: Slot) {
  return { startTime: slot.start, endTime: slot.end };
}

/** Subtract busy (meeting) intervals from a single [start, end] work window. */
function computeFreeSlots(workStart: Date, workEnd: Date, busy: Slot[]): Slot[] {
  const sorted = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
  const free: Slot[] = [];
  let cursor = workStart;
  for (const b of sorted) {
    const busyStart = b.start < workStart ? workStart : b.start;
    const busyEnd = b.end > workEnd ? workEnd : b.end;
    if (busyStart > cursor) free.push({ start: cursor, end: busyStart });
    if (busyEnd > cursor) cursor = busyEnd;
  }
  if (cursor < workEnd) free.push({ start: cursor, end: workEnd });
  return free.filter((s) => s.end > s.start);
}

/** Take `minutes` from the first slot with enough room; shrinks that slot in place. */
function takeFromFront(slots: Slot[], minutes: number): Slot | null {
  const idx = slots.findIndex((s) => minutesBetween(s.start, s.end) >= minutes);
  if (idx === -1) return null;
  const slot = slots[idx];
  const taken = { start: slot.start, end: addMinutes(slot.start, minutes) };
  slot.start = taken.end;
  if (minutesBetween(slot.start, slot.end) <= 0) slots.splice(idx, 1);
  return taken;
}

/** Take `minutes` off the END of the last slot that finishes at or before `before`. */
function takeFromBackBefore(slots: Slot[], before: Date, minutes: number): Slot | null {
  let bestIdx = -1;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].end <= before && minutesBetween(slots[i].start, slots[i].end) >= minutes) bestIdx = i;
  }
  if (bestIdx === -1) return null;
  const slot = slots[bestIdx];
  const taken = { start: addMinutes(slot.end, -minutes), end: slot.end };
  slot.end = taken.start;
  if (minutesBetween(slot.start, slot.end) <= 0) slots.splice(bestIdx, 1);
  return taken;
}

export function generateDailyPlan({
  day,
  workHourStart,
  workHourEnd,
  events,
  candidateTasks,
}: {
  day: Date;
  workHourStart: number;
  workHourEnd: number;
  events: CalendarEvent[];
  candidateTasks: Task[];
}): GeneratedBlock[] {
  const workStart = new Date(day);
  workStart.setHours(workHourStart, 0, 0, 0);
  const workEnd = new Date(day);
  workEnd.setHours(workHourEnd, 0, 0, 0);

  const busy: Slot[] = events
    .filter((e) => !e.isAllDay)
    .map((e) => ({ start: new Date(e.startTime), end: new Date(e.endTime) }));

  const slots = computeFreeSlots(workStart, workEnd, busy);
  const totalFreeMinutes = slots.reduce((sum, s) => sum + minutesBetween(s.start, s.end), 0);
  const targetMinutes = totalFreeMinutes * TARGET_LOAD_FRACTION;
  const maxMinutes = totalFreeMinutes * MAX_LOAD_FRACTION;

  const blocks: GeneratedBlock[] = [];
  let usedMinutes = 0;

  // 1. Meetings themselves, shown in context.
  for (const e of events) {
    blocks.push({
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
      type: "MEETING",
      title: e.title,
    });
  }

  // 2. Morning triage.
  const triage = takeFromFront(slots, TRIAGE_MINUTES);
  if (triage) {
    blocks.push({ ...slotTimes(triage), type: "TRIAGE", title: "Inbox and project triage" });
    usedMinutes += TRIAGE_MINUTES;
  }

  // 3. Prep blocks immediately before meetings that need it.
  const meetingsNeedingPrep = events
    .filter((e) => e.requiresPrep)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  for (const meeting of meetingsNeedingPrep) {
    const prep = takeFromBackBefore(slots, new Date(meeting.startTime), PREP_MINUTES);
    if (prep) {
      blocks.push({
        ...slotTimes(prep),
        type: "PREP",
        title: `Prepare: ${meeting.title}`,
        note: meeting.prepNotes ?? undefined,
      });
      usedMinutes += PREP_MINUTES;
    }
  }

  // 4. Fill remaining budget with the most urgent open tasks.
  const taskBudget = Math.max(0, targetMinutes - usedMinutes - FOLLOWUP_MINUTES);
  const sortedTasks = [...candidateTasks].sort((a, b) => taskUrgencyScore(b, day) - taskUrgencyScore(a, day));
  let taskMinutesUsed = 0;
  for (const task of sortedTasks) {
    if (taskMinutesUsed >= taskBudget) break;
    const duration = task.estimatedDuration ?? DEFAULT_TASK_MINUTES;
    if (usedMinutes + duration > maxMinutes) continue;
    const slot = takeFromFront(slots, duration);
    if (!slot) continue;
    blocks.push({ ...slotTimes(slot), type: "FOCUS", title: task.title, taskId: task.id });
    usedMinutes += duration;
    taskMinutesUsed += duration;
  }

  // 5. End-of-day follow-ups pass.
  const followUp = takeFromBackBefore(slots, workEnd, FOLLOWUP_MINUTES);
  if (followUp) {
    blocks.push({ ...slotTimes(followUp), type: "FOLLOWUP", title: "Follow-ups" });
  }

  return blocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
