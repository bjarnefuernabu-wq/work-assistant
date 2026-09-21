"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";

const captureSchema = z.object({ title: z.string().min(1).max(300) });

export type CaptureFormState = { error?: string } | undefined;

export async function captureInboxItem(_prev: CaptureFormState, formData: FormData): Promise<CaptureFormState> {
  const user = await requireUser();
  const parsed = captureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.inboxItem.create({
    data: { userId: user.id, type: "NOTE", title: parsed.data.title, sourceType: "manual", status: "NEW" },
  });
  revalidatePath("/inbox");
}

/** Converts an inbox item into a real task, optionally linked to the suggested project. */
export async function convertToTask(itemId: string) {
  const user = await requireUser();
  const item = await prisma.inboxItem.findFirst({ where: { id: itemId, userId: user.id } });
  if (!item) return;

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: item.title,
      description: item.content,
      projectId: item.suggestedProjectId,
      status: "INBOX",
      priority: "NORMAL",
      source: item.sourceType === "email" ? "AI_SUGGESTED" : "MANUAL",
      sourceReference: item.sourceReference,
    },
  });
  await prisma.inboxItem.update({ where: { id: itemId }, data: { status: "CONVERTED", resolvedAt: new Date() } });
  await logActivity({ userId: user.id, entityType: "Task", entityId: task.id, action: "task_created", summary: `Converted inbox item to task '${task.title}'` });
  revalidatePath("/inbox");
  revalidatePath("/tasks");
}

export async function dismissInboxItem(itemId: string) {
  const user = await requireUser();
  const item = await prisma.inboxItem.findFirst({ where: { id: itemId, userId: user.id } });
  if (!item) return;
  await prisma.inboxItem.update({ where: { id: itemId }, data: { status: "DISMISSED", resolvedAt: new Date() } });
  revalidatePath("/inbox");
}
