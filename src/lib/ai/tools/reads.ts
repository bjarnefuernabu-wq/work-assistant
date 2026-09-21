import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { sortByUrgency, waitingItemAgeDays } from "@/lib/dashboard/scoring";
import { getDashboardData } from "@/lib/dashboard/data";
import { getT } from "@/lib/i18n/translate";
import type { ToolDefinition } from "@/lib/ai/types";

// Tool results feed the model (or the mock formatter), never rendered as UI chrome directly, so
// these use the English dictionary regardless of the user's UI locale.
const toolT = getT("en");

function defineTool<TInput, TOutput>(def: ToolDefinition<TInput, TOutput>) {
  return def;
}

export const getProjectsTool = defineTool({
  name: "get_projects",
  description: "List the user's projects, optionally filtered by status. Returns id, name, status, priority, targetDate.",
  isWrite: false,
  requiresConfirmation: false,
  inputSchema: z.object({
    status: z.enum(["ACTIVE", "ON_HOLD", "AT_RISK", "COMPLETED", "CANCELLED"]).optional(),
  }),
  async run(input, ctx) {
    const projects = await prisma.project.findMany({
      where: { userId: ctx.userId, ...(input.status ? { status: input.status } : {}) },
      select: { id: true, name: true, status: true, priority: true, targetDate: true, objective: true },
      orderBy: { priority: "desc" },
    });
    return { projects };
  },
});

export const getProjectTool = defineTool({
  name: "get_project",
  description:
    "Get full detail on one project by name (case-insensitive partial match) or id: objective, status, tasks, milestones, risks, waiting items, recent decisions.",
  isWrite: false,
  requiresConfirmation: false,
  inputSchema: z.object({ nameOrId: z.string().min(1) }),
  async run(input, ctx) {
    const project = await prisma.project.findFirst({
      where: {
        userId: ctx.userId,
        OR: [{ id: input.nameOrId }, { name: { contains: input.nameOrId } }],
      },
      include: {
        tasks: { select: { id: true, title: true, status: true, priority: true, dueDate: true, plannedDate: true } },
        milestones: { select: { id: true, title: true, targetDate: true, status: true } },
        risks: { select: { title: true, probability: true, impact: true, status: true, isConfirmed: true } },
        waitingItems: { where: { status: "OPEN" }, include: { contact: true } },
        decisions: { select: { title: true, date: true, description: true }, orderBy: { date: "desc" }, take: 5 },
      },
    });
    if (!project) return { found: false as const };
    return {
      found: true as const,
      project: {
        id: project.id,
        name: project.name,
        objective: project.objective,
        status: project.status,
        priority: project.priority,
        targetDate: project.targetDate,
        openTasks: project.tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"),
        milestones: project.milestones,
        risks: project.risks,
        waitingOn: project.waitingItems.map((w) => ({
          title: w.title,
          contact: w.contact?.name,
          sinceDaysAgo: waitingItemAgeDays(w.since),
        })),
        recentDecisions: project.decisions,
      },
    };
  },
});

export const getTasksTool = defineTool({
  name: "get_tasks",
  description: "List tasks with optional filters. Use this for questions about what's open, overdue, or due soon.",
  isWrite: false,
  requiresConfirmation: false,
  inputSchema: z.object({
    status: z.enum(["INBOX", "PLANNED", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"]).optional(),
    projectNameOrId: z.string().optional(),
    onlyOverdue: z.boolean().optional(),
  }),
  async run(input, ctx) {
    let projectId: string | undefined;
    if (input.projectNameOrId) {
      const p = await prisma.project.findFirst({
        where: { userId: ctx.userId, OR: [{ id: input.projectNameOrId }, { name: { contains: input.projectNameOrId } }] },
        select: { id: true },
      });
      projectId = p?.id;
    }
    const tasks = await prisma.task.findMany({
      where: {
        userId: ctx.userId,
        ...(input.status ? { status: input.status } : {}),
        ...(projectId ? { projectId } : {}),
        ...(input.onlyOverdue ? { dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } } : {}),
      },
      include: { project: { select: { name: true } } },
    });
    return { tasks: sortByUrgency(tasks) };
  },
});

export const getTodayTasksTool = defineTool({
  name: "get_today_tasks",
  description: "Get everything relevant to today: due/overdue tasks, tasks planned for today, today's meetings, and follow-ups due.",
  isWrite: false,
  requiresConfirmation: false,
  inputSchema: z.object({}),
  async run(_input, ctx) {
    const data = await getDashboardData(ctx.userId, toolT);
    return { today: data.today, attention: data.attention };
  },
});

export const getWeekContextTool = defineTool({
  name: "get_week_context",
  description: "Get this week's deadlines, milestones, meetings, planned work, and whether the week looks overloaded.",
  isWrite: false,
  requiresConfirmation: false,
  inputSchema: z.object({}),
  async run(_input, ctx) {
    const data = await getDashboardData(ctx.userId, toolT);
    return { week: data.week };
  },
});

export const getWaitingItemsTool = defineTool({
  name: "get_waiting_items",
  description: "List open 'waiting for' / follow-up items — things blocked on someone else's response.",
  isWrite: false,
  requiresConfirmation: false,
  inputSchema: z.object({}),
  async run(_input, ctx) {
    const items = await prisma.waitingItem.findMany({
      where: { userId: ctx.userId, status: "OPEN" },
      include: { contact: true, project: { select: { name: true } } },
    });
    return {
      waitingItems: items.map((w) => ({
        title: w.title,
        contact: w.contact?.name,
        project: w.project?.name,
        sinceDaysAgo: waitingItemAgeDays(w.since),
        suggestedFollowUpAt: w.suggestedFollowUpAt,
      })),
    };
  },
});

export const findFreeTimeTool = defineTool({
  name: "find_free_time",
  description: "Find open (non-meeting) time slots on a given date within work hours.",
  isWrite: false,
  requiresConfirmation: false,
  inputSchema: z.object({ date: z.string().describe("ISO date, e.g. 2026-09-22") }),
  async run(input, ctx) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    const day = new Date(input.date);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const events = await prisma.calendarEvent.findMany({
      where: { userId: ctx.userId, startTime: { gte: dayStart, lte: dayEnd }, isAllDay: false },
      orderBy: { startTime: "asc" },
    });
    return {
      workHours: `${user.workHourStart}:00-${user.workHourEnd}:00`,
      busy: events.map((e) => ({ title: e.title, start: e.startTime, end: e.endTime })),
    };
  },
});
