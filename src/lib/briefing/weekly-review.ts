import "server-only";
import { addDays, startOfWeek, subDays } from "date-fns";
import { prisma } from "@/lib/db/client";
import { sortByUrgency, waitingItemAgeDays } from "@/lib/dashboard/scoring";

export interface WeeklyReview {
  weekStart: Date;
  weekEnd: Date;
  completedTasks: { id: string; title: string; projectName?: string }[];
  overdueTasks: { id: string; title: string; dueDate: Date }[];
  openWaitingItems: { id: string; title: string; contact?: string; ageDays: number }[];
  newRisks: { id: string; title: string; projectName: string }[];
  decisions: { id: string; title: string; projectName: string; date: Date }[];
  nextWeekDeadlines: { id: string; title: string; dueDate: Date }[];
  nextWeekMeetings: { id: string; title: string; startTime: Date }[];
  suggestedPriorities: { id: string; title: string }[];
}

/** Deterministic, data-grounded — same rationale as the morning briefing. */
export async function buildWeeklyReview(userId: string, now = new Date()): Promise<WeeklyReview> {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const lookback = subDays(now, 7);
  const lookahead = addDays(now, 14);

  const [completed, overdue, waiting, risks, decisions, upcomingTasks, upcomingEvents, openTasks] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: "COMPLETED", completedAt: { gte: lookback } },
      include: { project: { select: { name: true } } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { userId, status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { lt: now } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.waitingItem.findMany({ where: { userId, status: "OPEN" }, include: { contact: true } }),
    prisma.projectRisk.findMany({
      where: { project: { userId }, createdAt: { gte: lookback } },
      include: { project: { select: { name: true } } },
    }),
    prisma.decision.findMany({
      where: { project: { userId }, date: { gte: lookback } },
      include: { project: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { userId, status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { gte: now, lte: lookahead } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.calendarEvent.findMany({
      where: { userId, startTime: { gte: addDays(weekEnd, 1), lte: addDays(weekEnd, 7) } },
      orderBy: { startTime: "asc" },
    }),
    prisma.task.findMany({ where: { userId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
  ]);

  return {
    weekStart,
    weekEnd,
    completedTasks: completed.map((t) => ({ id: t.id, title: t.title, projectName: t.project?.name })),
    overdueTasks: overdue.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate! })),
    openWaitingItems: waiting.map((w) => ({ id: w.id, title: w.title, contact: w.contact?.name, ageDays: waitingItemAgeDays(w.since, now) })),
    newRisks: risks.map((r) => ({ id: r.id, title: r.title, projectName: r.project.name })),
    decisions: decisions.map((d) => ({ id: d.id, title: d.title, projectName: d.project.name, date: d.date })),
    nextWeekDeadlines: upcomingTasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate! })),
    nextWeekMeetings: upcomingEvents.map((e) => ({ id: e.id, title: e.title, startTime: e.startTime })),
    suggestedPriorities: sortByUrgency(openTasks)
      .slice(0, 5)
      .map((t) => ({ id: t.id, title: t.title })),
  };
}
