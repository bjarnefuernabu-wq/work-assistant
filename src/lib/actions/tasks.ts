"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { encodeStringList, parseTagsInput } from "@/lib/db/fields";

const taskSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }).max(300),
  description: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(["INBOX", "PLANNED", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  dueDate: z.string().optional(),
  plannedDate: z.string().optional(),
  estimatedDuration: z.string().optional(),
  assignee: z.string().optional(),
  tags: z.string().optional(),
  dependsOnId: z.string().optional(),
});

function toDate(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Verifies a projectId/taskId actually belongs to this user before it's trusted as a foreign key. */
async function ownedProjectId(projectId: string | undefined, userId: string): Promise<string | null> {
  if (!projectId) return null;
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  return project?.id ?? null;
}

async function ownedTaskId(taskId: string | undefined, userId: string): Promise<string | null> {
  if (!taskId) return null;
  const task = await prisma.task.findFirst({ where: { id: taskId, userId }, select: { id: true } });
  return task?.id ?? null;
}

export type TaskFormState = { error?: string } | undefined;

export async function createTask(
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await requireUser();
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const projectId = await ownedProjectId(data.projectId, user.id);
  const dependsOnId = await ownedTaskId(data.dependsOnId, user.id);

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: data.title,
      description: data.description || null,
      projectId,
      status: data.status,
      priority: data.priority,
      dueDate: toDate(data.dueDate) ?? null,
      plannedDate: toDate(data.plannedDate) ?? null,
      estimatedDuration: data.estimatedDuration ? Number(data.estimatedDuration) : null,
      assignee: data.assignee || null,
      tagsJson: encodeStringList(parseTagsInput(data.tags ?? "")),
      completedAt: data.status === "COMPLETED" ? new Date() : null,
    },
  });

  if (dependsOnId) {
    await prisma.taskDependency.create({
      data: { taskId: task.id, dependsOnId },
    });
  }

  await logActivity({
    userId: user.id,
    entityType: "Task",
    entityId: task.id,
    action: "task_created",
    summary: `Created task '${task.title}'`,
  });

  revalidatePath("/tasks");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  redirect(projectId ? `/projects/${projectId}` : "/tasks");
}

export async function updateTask(
  taskId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await requireUser();
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId: user.id } });
  if (!existing) return { error: "Task not found." };

  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const projectId = await ownedProjectId(data.projectId, user.id);
  const wasCompleted = existing.status === "COMPLETED";
  const nowCompleted = data.status === "COMPLETED";

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description || null,
      projectId,
      status: data.status,
      priority: data.priority,
      dueDate: toDate(data.dueDate) ?? null,
      plannedDate: toDate(data.plannedDate) ?? null,
      estimatedDuration: data.estimatedDuration ? Number(data.estimatedDuration) : null,
      assignee: data.assignee || null,
      tagsJson: encodeStringList(parseTagsInput(data.tags ?? "")),
      completedAt: nowCompleted ? (existing.completedAt ?? new Date()) : wasCompleted ? null : existing.completedAt,
    },
  });

  if (!wasCompleted && nowCompleted) {
    await logActivity({
      userId: user.id,
      entityType: "Task",
      entityId: taskId,
      action: "task_completed",
      summary: `Completed '${data.title}'`,
    });
  }

  revalidatePath("/tasks");
  if (existing.projectId) revalidatePath(`/projects/${existing.projectId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);
  redirect(projectId ? `/projects/${projectId}` : "/tasks");
}

/** Quick-toggle from a list row (checkbox). Does not redirect. */
export async function toggleTaskComplete(taskId: string, completed: boolean) {
  const user = await requireUser();
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId: user.id } });
  if (!existing) return;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: completed ? "COMPLETED" : "PLANNED",
      completedAt: completed ? new Date() : null,
    },
  });

  if (completed) {
    await logActivity({
      userId: user.id,
      entityType: "Task",
      entityId: taskId,
      action: "task_completed",
      summary: `Completed '${existing.title}'`,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (existing.projectId) revalidatePath(`/projects/${existing.projectId}`);
}

/** Consequential-ish but low-blast-radius single-item delete; UI still confirms. */
export async function deleteTask(taskId: string) {
  const user = await requireUser();
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId: user.id } });
  if (!existing) return;

  await prisma.task.delete({ where: { id: taskId } });

  await logActivity({
    userId: user.id,
    entityType: "Task",
    entityId: taskId,
    action: "task_deleted",
    summary: `Deleted task '${existing.title}'`,
  });

  revalidatePath("/tasks");
  if (existing.projectId) revalidatePath(`/projects/${existing.projectId}`);
}
