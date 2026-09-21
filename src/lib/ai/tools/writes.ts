import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logActivity } from "@/lib/activity/log";
import type { ToolDefinition } from "@/lib/ai/types";

function defineTool<TInput, TOutput>(def: ToolDefinition<TInput, TOutput>) {
  return def;
}

// Single-entity, non-destructive writes: low blast radius, so these execute immediately (still
// fully logged to AIActionLog by the tool runner). Anything destructive, bulk, or that leaves
// the app (sending mail) lives in confirmed.ts instead — see PRODUCT_SPEC.md §20.

export const createTaskTool = defineTool({
  name: "create_task",
  description: "Create a single new task. Use plannedDate for when the user intends to work on it and dueDate for a hard deadline — they are different.",
  isWrite: true,
  requiresConfirmation: false,
  inputSchema: z.object({
    title: z.string().min(1).max(300),
    projectNameOrId: z.string().optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
    dueDate: z.string().optional().describe("ISO date"),
    plannedDate: z.string().optional().describe("ISO date"),
    estimatedDurationMinutes: z.number().int().positive().optional(),
  }),
  describeCall: (input) => `Create task "${input.title}"${input.projectNameOrId ? ` in ${input.projectNameOrId}` : ""}`,
  async run(input, ctx) {
    let projectId: string | undefined;
    if (input.projectNameOrId) {
      const p = await prisma.project.findFirst({
        where: { userId: ctx.userId, OR: [{ id: input.projectNameOrId }, { name: { contains: input.projectNameOrId } }] },
        select: { id: true },
      });
      projectId = p?.id;
    }
    const task = await prisma.task.create({
      data: {
        userId: ctx.userId,
        title: input.title,
        projectId,
        priority: input.priority,
        status: "INBOX",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        plannedDate: input.plannedDate ? new Date(input.plannedDate) : null,
        estimatedDuration: input.estimatedDurationMinutes,
        source: "AI_SUGGESTED",
        sourceReference: "assistant-chat",
      },
    });
    await logActivity({ userId: ctx.userId, entityType: "Task", entityId: task.id, action: "task_created", summary: `AI assistant created task '${task.title}'` });
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { taskId: task.id, title: task.title };
  },
});

export const updateTaskTool = defineTool({
  name: "update_task",
  description: "Update fields on an existing task (status, priority, dueDate, plannedDate). Only pass fields that should change.",
  isWrite: true,
  requiresConfirmation: false,
  inputSchema: z.object({
    taskId: z.string(),
    status: z.enum(["INBOX", "PLANNED", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"]).optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).optional(),
    dueDate: z.string().optional(),
    plannedDate: z.string().optional(),
  }),
  describeCall: (input) => `Update task ${input.taskId}`,
  async run(input, ctx) {
    const existing = await prisma.task.findFirst({ where: { id: input.taskId, userId: ctx.userId } });
    if (!existing) return { ok: false as const, error: "Task not found or not yours." };
    const task = await prisma.task.update({
      where: { id: input.taskId },
      data: {
        ...(input.status ? { status: input.status, completedAt: input.status === "COMPLETED" ? new Date() : existing.completedAt } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
        ...(input.plannedDate ? { plannedDate: new Date(input.plannedDate) } : {}),
      },
    });
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { ok: true as const, taskId: task.id, status: task.status };
  },
});

export const completeTaskTool = defineTool({
  name: "complete_task",
  description: "Mark a task as completed.",
  isWrite: true,
  requiresConfirmation: false,
  inputSchema: z.object({ taskId: z.string() }),
  describeCall: (input) => `Complete task ${input.taskId}`,
  async run(input, ctx) {
    const existing = await prisma.task.findFirst({ where: { id: input.taskId, userId: ctx.userId } });
    if (!existing) return { ok: false as const, error: "Task not found or not yours." };
    await prisma.task.update({ where: { id: input.taskId }, data: { status: "COMPLETED", completedAt: new Date() } });
    await logActivity({ userId: ctx.userId, entityType: "Task", entityId: input.taskId, action: "task_completed", summary: `AI assistant completed '${existing.title}'` });
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { ok: true as const };
  },
});

export const createEmailDraftTool = defineTool({
  name: "create_email_draft",
  description: "Create an email reply/draft for the user to review. This never sends the email — it only saves a draft for the user to edit and approve.",
  isWrite: true,
  requiresConfirmation: false,
  inputSchema: z.object({
    threadId: z.string().optional(),
    projectNameOrId: z.string().optional(),
    subject: z.string().min(1),
    bodyText: z.string().min(1),
  }),
  describeCall: (input) => `Draft email "${input.subject}"`,
  async run(input, ctx) {
    let projectId: string | undefined;
    if (input.projectNameOrId) {
      const p = await prisma.project.findFirst({
        where: { userId: ctx.userId, OR: [{ id: input.projectNameOrId }, { name: { contains: input.projectNameOrId } }] },
        select: { id: true },
      });
      projectId = p?.id;
    }
    const draft = await prisma.emailDraft.create({
      data: {
        userId: ctx.userId,
        threadId: input.threadId,
        projectId,
        subject: input.subject,
        bodyText: input.bodyText,
        generatedByAI: true,
        status: "DRAFT",
      },
    });
    revalidatePath("/email");
    return { draftId: draft.id };
  },
});
