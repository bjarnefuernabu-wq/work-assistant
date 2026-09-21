import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logActivity } from "@/lib/activity/log";
import { generateWeeklyPlan } from "@/lib/planning/generate-weekly";
import { startOfWeek, startOfDay } from "date-fns";
import type { ToolDefinition } from "@/lib/ai/types";

function defineTool<TInput, TOutput>(def: ToolDefinition<TInput, TOutput>) {
  return def;
}

// Consequential writes: requiresConfirmation = true. The tool runner never calls `run()` for
// these from the model's first request — it surfaces `describeCall()` to the user and only
// executes after a separate, explicit confirm. See src/lib/ai/tool-runner.ts.

export const sendEmailDraftTool = defineTool({
  name: "send_email_draft",
  description: "Send a previously created email draft. This leaves the app and reaches a real person — always requires explicit user confirmation first.",
  isWrite: true,
  requiresConfirmation: true,
  inputSchema: z.object({ draftId: z.string() }),
  describeCall: (input) => `Send email draft ${input.draftId}`,
  async run(input, ctx) {
    const draft = await prisma.emailDraft.findFirst({ where: { id: input.draftId, userId: ctx.userId } });
    if (!draft) return { ok: false as const, error: "Draft not found or not yours." };
    // No real mail connector is wired up (mock-mail only) — this simulates the send so the
    // confirmation flow is real end-to-end without actually delivering mail. See
    // ARCHITECTURE.md / connectors.
    await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "SENT", sentAt: new Date() } });
    if (draft.threadId) {
      await prisma.emailThread.update({ where: { id: draft.threadId }, data: { requiresAction: false } });
    }
    await logActivity({ userId: ctx.userId, entityType: "EmailDraft", entityId: draft.id, action: "email_sent", summary: `Sent email '${draft.subject}' (simulated — no live mail connector)` });
    revalidatePath("/email");
    revalidatePath("/dashboard");
    return { ok: true as const };
  },
});

export const applyWeeklyPlanTool = defineTool({
  name: "apply_weekly_plan",
  description: "Assign planned dates to this week's unplanned tasks according to the generated weekly plan. Modifies multiple tasks at once — always requires explicit user confirmation first.",
  isWrite: true,
  requiresConfirmation: true,
  inputSchema: z.object({ weekStart: z.string().describe("ISO date for the Monday of the target week") }),
  describeCall: () => `Assign planned dates to this week's unplanned tasks`,
  async run(input, ctx) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    const weekStart = startOfWeek(new Date(input.weekStart), { weekStartsOn: 1 });
    const weekEnd = new Date(weekStart.getTime() + 6 * 86_400_000);

    const [events, tasks] = await Promise.all([
      prisma.calendarEvent.findMany({ where: { userId: ctx.userId, startTime: { gte: weekStart, lte: weekEnd } } }),
      prisma.task.findMany({
        where: { userId: ctx.userId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        include: { project: { select: { priority: true } } },
      }),
    ]);

    const plan = generateWeeklyPlan({
      weekStart,
      workHourStart: user.workHourStart,
      workHourEnd: user.workHourEnd,
      events,
      openTasks: tasks,
    });

    await prisma.$transaction(
      plan.proposedAssignments.map((a) =>
        prisma.task.update({ where: { id: a.taskId }, data: { plannedDate: a.plannedDate } }),
      ),
    );
    await prisma.weeklyPlan.upsert({
      where: { userId_weekStart: { userId: ctx.userId, weekStart } },
      create: { userId: ctx.userId, weekStart, summaryJson: JSON.stringify({ assignedCount: plan.proposedAssignments.length, source: "assistant" }) },
      update: { generatedAt: new Date(), summaryJson: JSON.stringify({ assignedCount: plan.proposedAssignments.length, source: "assistant" }) },
    });
    await logActivity({ userId: ctx.userId, entityType: "WeeklyPlan", action: "weekly_plan_applied", summary: `AI assistant scheduled ${plan.proposedAssignments.length} task(s) for the week of ${startOfDay(weekStart).toDateString()}` });

    revalidatePath("/planning/week");
    revalidatePath("/tasks");
    return { assignedCount: plan.proposedAssignments.length };
  },
});
