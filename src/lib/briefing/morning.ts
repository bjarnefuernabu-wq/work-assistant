import "server-only";
import { getDashboardData } from "@/lib/dashboard/data";
import { sortByUrgency } from "@/lib/dashboard/scoring";

export interface MorningBriefing {
  generatedAt: Date;
  meetingsCount: number;
  firstMeeting?: { title: string; time: Date };
  importantTasks: { id: string; title: string }[];
  deadlinesToday: { id: string; title: string }[];
  followUpsDue: { id: string; title: string; contact?: string }[];
  criticalProjects: { id: string; name: string; reason: string }[];
  prepNeeded: { title: string; time: Date; notes?: string | null }[];
  primaryFocus?: { id: string; title: string; reason: string };
}

/**
 * Deterministic, fully data-grounded (no LLM call) — deliberately: a briefing is exactly the
 * kind of output where inventing anything is worse than a plainer, reliable summary. See
 * PRODUCT_SPEC.md §"Morning Briefing" and core principle #1.
 */
export async function buildMorningBriefing(userId: string): Promise<MorningBriefing> {
  const data = await getDashboardData(userId);
  const { today, attention } = data;

  const importantTasks = sortByUrgency([...today.overdueTasks, ...today.dueTasks, ...today.plannedTasks])
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .slice(0, 5)
    .map((t) => ({ id: t.id, title: t.title }));

  const primary = importantTasks[0];
  const criticalAttention = attention.find((a) => a.severity === "critical");

  return {
    generatedAt: new Date(),
    meetingsCount: today.events.length,
    firstMeeting: today.events[0] ? { title: today.events[0].title, time: today.events[0].startTime } : undefined,
    importantTasks,
    deadlinesToday: today.dueTasks.map((t) => ({ id: t.id, title: t.title })),
    followUpsDue: today.followUpsDue.map((w) => ({ id: w.id, title: w.title, contact: w.contact?.name })),
    criticalProjects: attention
      .filter((a) => a.severity === "critical")
      .slice(0, 3)
      .map((a) => ({ id: a.projectId, name: a.projectName, reason: a.facts[0] })),
    prepNeeded: today.meetingsNeedingPrep.map((e) => ({ title: e.title, time: e.startTime, notes: e.prepNotes })),
    primaryFocus: primary
      ? { id: primary.id, title: primary.title, reason: "Highest-urgency open item today (priority + due date)." }
      : criticalAttention
        ? { id: criticalAttention.projectId, title: criticalAttention.projectName, reason: criticalAttention.observation }
        : undefined,
  };
}
