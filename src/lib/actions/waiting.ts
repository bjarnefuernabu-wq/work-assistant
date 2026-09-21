"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";

const waitingSchema = z.object({
  title: z.string().min(1).max(300),
  contactId: z.string().optional(),
  projectId: z.string().optional(),
  since: z.string().optional(),
  suggestedFollowUpAt: z.string().optional(),
  notes: z.string().optional(),
});

export type WaitingFormState = { error?: string } | undefined;

export async function createWaitingItem(_prev: WaitingFormState, formData: FormData): Promise<WaitingFormState> {
  const user = await requireUser();
  const parsed = waitingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const [project, contact] = await Promise.all([
    data.projectId ? prisma.project.findFirst({ where: { id: data.projectId, userId: user.id }, select: { id: true } }) : null,
    data.contactId ? prisma.contact.findFirst({ where: { id: data.contactId, userId: user.id }, select: { id: true } }) : null,
  ]);

  const item = await prisma.waitingItem.create({
    data: {
      userId: user.id,
      title: data.title,
      contactId: contact?.id ?? null,
      projectId: project?.id ?? null,
      since: data.since ? new Date(data.since) : new Date(),
      suggestedFollowUpAt: data.suggestedFollowUpAt ? new Date(data.suggestedFollowUpAt) : null,
      notes: data.notes || null,
    },
  });
  await logActivity({ userId: user.id, entityType: "WaitingItem", entityId: item.id, action: "waiting_item_created", summary: `Started waiting on '${item.title}'` });
  revalidatePath("/followups");
  revalidatePath("/dashboard");
}

export async function resolveWaitingItem(id: string) {
  const user = await requireUser();
  const existing = await prisma.waitingItem.findFirst({ where: { id, userId: user.id } });
  if (!existing) return;
  await prisma.waitingItem.update({ where: { id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
  await logActivity({ userId: user.id, entityType: "WaitingItem", entityId: id, action: "waiting_item_resolved", summary: `Resolved '${existing.title}'` });
  revalidatePath("/followups");
  revalidatePath("/dashboard");
}
