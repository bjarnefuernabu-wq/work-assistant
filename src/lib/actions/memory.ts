"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";

const memorySchema = z.object({
  category: z.enum(["PREFERENCE", "PROJECT_KNOWLEDGE", "CONTACT", "DECISION", "WORKING_PATTERN"]),
  content: z.string().min(1).max(1000),
});

export type MemoryFormState = { error?: string } | undefined;

export async function createMemoryEntry(_prev: MemoryFormState, formData: FormData): Promise<MemoryFormState> {
  const user = await requireUser();
  const parsed = memorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.memoryEntry.create({
    data: { userId: user.id, category: parsed.data.category, content: parsed.data.content, source: "user" },
  });
  await logActivity({ userId: user.id, entityType: "MemoryEntry", action: "memory_created", summary: `Added ${parsed.data.category.toLowerCase()} memory` });
  revalidatePath("/settings");
}

export async function updateMemoryEntry(id: string, content: string) {
  const user = await requireUser();
  const existing = await prisma.memoryEntry.findFirst({ where: { id, userId: user.id } });
  if (!existing) return;
  await prisma.memoryEntry.update({ where: { id }, data: { content } });
  revalidatePath("/settings");
}

export async function deleteMemoryEntry(id: string) {
  const user = await requireUser();
  const existing = await prisma.memoryEntry.findFirst({ where: { id, userId: user.id } });
  if (!existing) return;
  await prisma.memoryEntry.delete({ where: { id } });
  await logActivity({ userId: user.id, entityType: "MemoryEntry", action: "memory_deleted", summary: `Deleted a ${existing.category.toLowerCase()} memory entry` });
  revalidatePath("/settings");
}
