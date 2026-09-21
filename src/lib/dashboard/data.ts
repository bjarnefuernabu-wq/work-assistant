import "server-only";
import { addDays, endOfDay, endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { prisma } from "@/lib/db/client";
import { waitingItemAgeDays } from "@/lib/dashboard/scoring";
import type { TranslateFn } from "@/lib/i18n/translate";

export interface AttentionItem {
  projectId: string;
  projectName: string;
  severity: "critical" | "warning";
  /** Stated facts backing the callout — never inferred, always traceable to a record. */
  facts: string[];
  /** The derived observation connecting the facts. */
  observation: string;
  /** What we suggest doing about it — a suggestion, not an automatic action. */
  recommendation: string;
}

export async function getDashboardData(userId: string, t: TranslateFn) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const soon = addDays(now, 2);

  const [projects, tasks, events, waitingItems, threads] = await Promise.all([
    prisma.project.findMany({
      where: { userId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: { milestones: true },
    }),
    prisma.task.findMany({
      where: { userId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.calendarEvent.findMany({
      where: { userId, startTime: { gte: todayStart, lte: weekEnd } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.waitingItem.findMany({
      where: { userId, status: "OPEN" },
      include: { project: { select: { id: true, name: true } }, contact: true },
    }),
    prisma.emailThread.findMany({
      where: { userId, requiresAction: true },
      orderBy: { lastMessageAt: "desc" },
      take: 10,
    }),
  ]);

  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < todayStart);
  const dueTodayTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) <= todayEnd,
  );
  const plannedTodayTasks = tasks.filter(
    (t) => t.plannedDate && new Date(t.plannedDate) >= todayStart && new Date(t.plannedDate) <= todayEnd,
  );
  const todaysEvents = events.filter((e) => new Date(e.startTime) <= todayEnd);
  const meetingsNeedingPrep = events.filter(
    (e) => e.requiresPrep && new Date(e.startTime) >= now && new Date(e.startTime) <= soon,
  );
  const followUpsDue = waitingItems.filter(
    (w) => w.suggestedFollowUpAt && new Date(w.suggestedFollowUpAt) <= todayEnd,
  );

  const weekEvents = events.filter((e) => new Date(e.startTime) >= weekStart && new Date(e.startTime) <= weekEnd);
  const weekDueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= weekStart && new Date(t.dueDate) <= weekEnd);
  const weekMilestones = projects
    .flatMap((p) => p.milestones.map((m) => ({ ...m, projectName: p.name, projectId: p.id })))
    .filter((m) => m.status !== "DONE" && new Date(m.targetDate) >= weekStart && new Date(m.targetDate) <= weekEnd)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  const weekPlannedTasks = tasks.filter(
    (t) => t.plannedDate && new Date(t.plannedDate) >= weekStart && new Date(t.plannedDate) <= weekEnd,
  );

  // Overload check: rough capacity vs planned+meeting minutes for the remaining work days this week.
  const workdaysRemaining = Math.max(
    0,
    [0, 1, 2, 3, 4].filter((offset) => addDays(weekStart, offset) >= todayStart).length,
  );
  const capacityMinutes = workdaysRemaining * 8 * 60 * 0.75; // ~75% of an 8h day, buffer built in
  const meetingMinutesThisWeek = weekEvents.reduce(
    (sum, e) => sum + Math.max(0, (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000),
    0,
  );
  const plannedMinutesThisWeek = weekPlannedTasks.reduce((sum, t) => sum + (t.estimatedDuration ?? 45), 0);
  const isOverloaded = capacityMinutes > 0 && plannedMinutesThisWeek + meetingMinutesThisWeek > capacityMinutes;

  // ---------------------------------------------------------------------
  // Projects requiring attention — facts -> observation -> recommendation.
  // ---------------------------------------------------------------------
  const attention: AttentionItem[] = [];

  for (const project of projects) {
    const facts: string[] = [];
    let severity: "critical" | "warning" = "warning";

    const projectWaiting = waitingItems.filter((w) => w.projectId === project.id);
    const oldestWaiting = projectWaiting.sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime())[0];
    if (oldestWaiting) {
      const age = waitingItemAgeDays(oldestWaiting.since, now);
      if (age >= 5) {
        facts.push(
          t('Waiting on "{title}" ({contact}) for {age} days', {
            title: oldestWaiting.title,
            contact: oldestWaiting.contact?.name ?? t("unknown"),
            age,
          }),
        );
        if (age >= 7) severity = "critical";
      }
    }

    const projectOverdue = overdueTasks.filter((t) => t.projectId === project.id);
    if (projectOverdue.length > 0) {
      facts.push(
        t("{n} overdue task(s): {list}{more}", {
          n: projectOverdue.length,
          list: projectOverdue
            .slice(0, 2)
            .map((t) => t.title)
            .join(", "),
          more: projectOverdue.length > 2 ? ", …" : "",
        }),
      );
      severity = "critical";
    }

    const nearMilestone = project.milestones
      .filter((m) => m.status !== "DONE" && new Date(m.targetDate) <= soon && new Date(m.targetDate) >= todayStart)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];
    const openProjectTasks = tasks.filter((t) => t.projectId === project.id);
    if (nearMilestone) {
      const remainingMinutes = openProjectTasks.reduce((sum, t) => sum + (t.estimatedDuration ?? 0), 0);
      facts.push(
        t('Milestone "{title}" due {date}, {n} open task(s){estimate}', {
          title: nearMilestone.title,
          date: new Date(nearMilestone.targetDate).toLocaleDateString(),
          n: openProjectTasks.length,
          estimate: remainingMinutes ? t(" (~{h}h estimated)", { h: Math.round(remainingMinutes / 60) }) : "",
        }),
      );
      severity = "critical";
    }

    const projectMeetingsSoon = meetingsNeedingPrep.filter((e) => e.projectId === project.id);
    if (projectMeetingsSoon.length > 0) {
      facts.push(
        t('Prep needed for "{title}" on {date}', {
          title: projectMeetingsSoon[0].title,
          date: new Date(projectMeetingsSoon[0].startTime).toLocaleDateString(),
        }),
      );
    }

    if (project.status === "AT_RISK") {
      facts.push(t("Project status is explicitly set to At risk"));
      severity = "critical";
    }

    if (facts.length === 0) continue;

    attention.push({
      projectId: project.id,
      projectName: project.name,
      severity,
      facts,
      observation:
        severity === "critical"
          ? t("This project has time-critical items that are behind or at risk.")
          : t("This project has open items worth checking on soon."),
      recommendation:
        oldestWaiting && waitingItemAgeDays(oldestWaiting.since, now) >= 5
          ? t('Follow up on "{title}" directly instead of waiting further.', { title: oldestWaiting.title })
          : projectOverdue.length > 0
            ? t("Reschedule or complete the overdue task(s) first.")
            : t("Review open tasks against the upcoming milestone."),
    });
  }

  attention.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));

  return {
    today: {
      events: todaysEvents,
      dueTasks: dueTodayTasks,
      overdueTasks,
      plannedTasks: plannedTodayTasks,
      followUpsDue,
      meetingsNeedingPrep,
    },
    week: {
      events: weekEvents,
      dueTasks: weekDueTasks,
      milestones: weekMilestones,
      plannedTasks: weekPlannedTasks,
      isOverloaded,
      capacityMinutes: Math.round(capacityMinutes),
      committedMinutes: Math.round(plannedMinutesThisWeek + meetingMinutesThisWeek),
    },
    attention,
    emailRequiringAction: threads,
  };
}
