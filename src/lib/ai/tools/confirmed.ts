import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logActivity } from "@/lib/activity/log";
import { generateWeeklyPlan } from "@/lib/planning/generate-weekly";
import { performSendEmailDraft } from "@/lib/email/send";
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
  describeCall: (input, ctx) => ctx.t("Send email draft {id}", { id: input.draftId }),
  async run(input, ctx) {
    const result = await performSendEmailDraft(input.draftId, ctx.userId);
    revalidatePath("/email");
    revalidatePath("/dashboard");
    return result;
  },
});

export const applyWeeklyPlanTool = defineTool({
  name: "apply_weekly_plan",
  description: "Assign planned dates to this week's unplanned tasks according to the generated weekly plan. Modifies multiple tasks at once — always requires explicit user confirmation first.",
  isWrite: true,
  requiresConfirmation: true,
  inputSchema: z.object({ weekStart: z.string().describe("ISO date for the Monday of the target week") }),
  describeCall: (_input, ctx) => ctx.t("Assign planned dates to this week's unplanned tasks"),
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
