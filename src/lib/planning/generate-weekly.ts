import { addDays, isAfter, isBefore, startOfDay } from "date-fns";
import type { CalendarEvent, Priority, Task } from "@/generated/prisma/client";
import type { TranslateFn } from "@/lib/i18n/translate";

const DAILY_TARGET_FRACTION = 0.75;
const DEFAULT_TASK_MINUTES = 45;

const PRIORITY_RANK: Record<Priority, number> = { CRITICAL: 3, HIGH: 2, NORMAL: 1, LOW: 0 };

export interface WeeklyDayPlan {
  date: Date;
  capacityMinutes: number;
  committedMinutes: number;
  meetingMinutes: number;
  alreadyPlanned: { taskId: string; title: string; minutes: number }[];
  newlyAssigned: { taskId: string; title: string; minutes: number }[];
  overloaded: boolean;
}

export interface WeeklyPlanResult {
  days: WeeklyDayPlan[];
  unscheduledImportant: { taskId: string; title: string; priority: Priority; dueDate: Date | null }[];
  deadlineRisks: { taskId: string; title: string; dueDate: Date; reason: string }[];
  /** Proposed plannedDate assignments — not yet persisted; the caller applies these on confirm. */
  proposedAssignments: { taskId: string; plannedDate: Date }[];
}

export function generateWeeklyPlan({
  weekStart,
  workHourStart,
  workHourEnd,
  events,
  openTasks,
  today = new Date(),
  t = (k) => k,
}: {
  weekStart: Date;
  workHourStart: number;
  workHourEnd: number;
  events: CalendarEvent[];
  openTasks: (Task & { project?: { priority: Priority } | null })[];
  today?: Date;
  t?: TranslateFn;
}): WeeklyPlanResult {
  const dailyCapacity = (workHourEnd - workHourStart) * 60 * DAILY_TARGET_FRACTION;
  const weekdayDates = [0, 1, 2, 3, 4].map((i) => startOfDay(addDays(weekStart, i)));
  const todayStart = startOfDay(today);

  const days: WeeklyDayPlan[] = weekdayDates.map((date) => {
    const dayEvents = events.filter((e) => startOfDay(new Date(e.startTime)).getTime() === date.getTime());
    const meetingMinutes = dayEvents.reduce(
      (sum, e) => sum + Math.max(0, (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000),
      0,
    );
    const alreadyPlanned = openTasks
      .filter((t) => t.plannedDate && startOfDay(new Date(t.plannedDate)).getTime() === date.getTime())
      .map((t) => ({ taskId: t.id, title: t.title, minutes: t.estimatedDuration ?? DEFAULT_TASK_MINUTES }));
    const plannedMinutes = alreadyPlanned.reduce((sum, t) => sum + t.minutes, 0);
    const capacityMinutes = Math.max(0, dailyCapacity - meetingMinutes);

    return {
      date,
      capacityMinutes: Math.round(capacityMinutes),
      committedMinutes: Math.round(plannedMinutes + meetingMinutes),
      meetingMinutes: Math.round(meetingMinutes),
      alreadyPlanned,
      newlyAssigned: [],
      overloaded: plannedMinutes > capacityMinutes,
    };
  });

  // Remaining free minutes per day, only counting days from today onward as assignable.
  const remaining = days.map((d) =>
    isBefore(d.date, todayStart) ? 0 : Math.max(0, d.capacityMinutes - (d.committedMinutes - d.meetingMinutes)),
  );

  const candidates = openTasks
    .filter((t) => !t.plannedDate && t.status !== "WAITING")
    .sort((a, b) => {
      const scoreA = PRIORITY_RANK[a.priority] * 10 + (a.dueDate ? 5 : 0) + (a.project ? PRIORITY_RANK[a.project.priority] : 0);
      const scoreB = PRIORITY_RANK[b.priority] * 10 + (b.dueDate ? 5 : 0) + (b.project ? PRIORITY_RANK[b.project.priority] : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return a.dueDate ? -1 : b.dueDate ? 1 : 0;
    });

  const proposedAssignments: WeeklyPlanResult["proposedAssignments"] = [];
  const unscheduledImportant: WeeklyPlanResult["unscheduledImportant"] = [];
  const deadlineRisks: WeeklyPlanResult["deadlineRisks"] = [];

  for (const task of candidates) {
    const duration = task.estimatedDuration ?? DEFAULT_TASK_MINUTES;
    const deadline = task.dueDate ? new Date(task.dueDate) : null;
    // An already-overdue deadline shouldn't exclude the task from the week — it needs the
    // earliest available slot, not "before a due date that has already passed".
    const upcomingDeadline = deadline && isBefore(todayStart, deadline) ? deadline : null;

    let placed = false;
    for (let i = 0; i < days.length; i++) {
      if (isBefore(days[i].date, todayStart)) continue;
      if (upcomingDeadline && isAfter(days[i].date, upcomingDeadline)) break; // can't schedule past the deadline
      if (remaining[i] >= duration) {
        remaining[i] -= duration;
        days[i].newlyAssigned.push({ taskId: task.id, title: task.title, minutes: duration });
        days[i].committedMinutes += duration;
        days[i].overloaded = days[i].committedMinutes > days[i].capacityMinutes;
        proposedAssignments.push({ taskId: task.id, plannedDate: days[i].date });
        placed = true;
        break;
      }
    }

    if (!placed) {
      if (task.priority === "HIGH" || task.priority === "CRITICAL") {
        unscheduledImportant.push({ taskId: task.id, title: task.title, priority: task.priority, dueDate: deadline });
      }
      if (deadline && deadline >= weekStart && deadline <= days[days.length - 1].date) {
        deadlineRisks.push({
          taskId: task.id,
          title: task.title,
          dueDate: deadline,
          reason: t("Not enough unbooked time before the due date this week."),
        });
      }
    }
  }

  return { days, unscheduledImportant, deadlineRisks, proposedAssignments };
}
