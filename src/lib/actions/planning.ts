"use server";

import { revalidatePath } from "next/cache";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { requireUserT } from "@/lib/i18n/server";
import { logActivity } from "@/lib/activity/log";
import { generateDailyPlan } from "@/lib/planning/generate-daily";
import { generateWeeklyPlan, type WeeklyPlanResult } from "@/lib/planning/generate-weekly";

export async function generateDailyPlanAction(dateStr: string) {
  const user = await requireUser();
  const day = startOfDay(new Date(dateStr));

  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId: user.id, startTime: { gte: day, lte: endOfDay(day) } },
    }),
    prisma.task.findMany({
      where: { userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED", "WAITING"] } },
    }),
  ]);

  const blocks = generateDailyPlan({
    day,
    workHourStart: user.workHourStart,
    workHourEnd: user.workHourEnd,
    events,
    candidateTasks: tasks,
  });

  const existing = await prisma.dailyPlan.findUnique({ where: { userId_date: { userId: user.id, date: day } } });
  if (existing) {
    await prisma.dailyPlanBlock.deleteMany({ where: { dailyPlanId: existing.id } });
  }

  const capacityMinutes = (user.workHourEnd - user.workHourStart) * 60;
  const plannedMinutes = blocks
    .filter((b) => b.type === "FOCUS")
    .reduce((sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()) / 60000, 0);

  const plan = await prisma.dailyPlan.upsert({
    where: { userId_date: { userId: user.id, date: day } },
    create: {
      userId: user.id,
      date: day,
      capacityMinutes,
      plannedMinutes: Math.round(plannedMinutes),
      blocks: {
        create: blocks.map((b, i) => ({
          startTime: b.startTime,
          endTime: b.endTime,
          type: b.type,
          title: b.title,
          taskId: b.taskId,
          note: b.note,
          order: i,
        })),
      },
    },
    update: {
      generatedAt: new Date(),
      capacityMinutes,
      plannedMinutes: Math.round(plannedMinutes),
      blocks: {
        create: blocks.map((b, i) => ({
          startTime: b.startTime,
          endTime: b.endTime,
          type: b.type,
          title: b.title,
          taskId: b.taskId,
          note: b.note,
          order: i,
        })),
      },
    },
  });

  await logActivity({
    userId: user.id,
    entityType: "DailyPlan",
    entityId: plan.id,
    action: "daily_plan_generated",
    summary: `Generated daily plan for ${day.toDateString()} (${blocks.filter((b) => b.type === "FOCUS").length} focus blocks)`,
  });

  revalidatePath("/planning/day");
}

export async function deleteDailyPlanBlock(blockId: string) {
  const user = await requireUser();
  const block = await prisma.dailyPlanBlock.findFirst({
    where: { id: blockId, dailyPlan: { userId: user.id } },
  });
  if (!block) return;
  await prisma.dailyPlanBlock.delete({ where: { id: blockId } });
  revalidatePath("/planning/day");
}

export async function computeWeeklyPlanPreview(weekStartStr: string): Promise<WeeklyPlanResult> {
  const { user, t } = await requireUserT();
  const weekStart = startOfDay(new Date(weekStartStr));
  const weekEnd = endOfDay(new Date(weekStart.getTime() + 6 * 86_400_000));

  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { userId: user.id, startTime: { gte: weekStart, lte: weekEnd } } }),
    prisma.task.findMany({
      where: { userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: { project: { select: { priority: true } } },
    }),
  ]);

  return generateWeeklyPlan({
    weekStart,
    workHourStart: user.workHourStart,
    workHourEnd: user.workHourEnd,
    events,
    openTasks: tasks,
    t,
  });
}

/**
 * Consequential write: assigns plannedDate on multiple tasks at once. The UI must show the
 * proposed plan and get an explicit confirmation before calling this (PRODUCT_SPEC.md §2/§20).
 */
export async function applyWeeklyPlan(
  weekStartStr: string,
  assignments: { taskId: string; plannedDate: string }[],
) {
  const user = await requireUser();
  const weekStart = startOfDay(new Date(weekStartStr));

  const taskIds = assignments.map((a) => a.taskId);
  const owned = await prisma.task.findMany({ where: { id: { in: taskIds }, userId: user.id }, select: { id: true } });
  const ownedIds = new Set(owned.map((t) => t.id));

  await prisma.$transaction(
    assignments
      .filter((a) => ownedIds.has(a.taskId))
      .map((a) =>
        prisma.task.update({ where: { id: a.taskId }, data: { plannedDate: new Date(a.plannedDate) } }),
      ),
  );

  await prisma.weeklyPlan.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    create: { userId: user.id, weekStart, summaryJson: JSON.stringify({ assignedCount: assignments.length }) },
    update: { generatedAt: new Date(), summaryJson: JSON.stringify({ assignedCount: assignments.length }) },
  });

  await logActivity({
    userId: user.id,
    entityType: "WeeklyPlan",
    action: "weekly_plan_applied",
    summary: `Applied weekly plan for week of ${weekStart.toDateString()}: scheduled ${assignments.length} task(s)`,
  });

  revalidatePath("/planning/week");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
