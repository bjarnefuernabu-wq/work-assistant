"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { encodeStringList, parseTagsInput } from "@/lib/db/fields";

const projectSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }).max(200),
  description: z.string().optional(),
  objective: z.string().optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "AT_RISK", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  responsiblePerson: z.string().optional(),
  tags: z.string().optional(),
  budget: z.string().optional(),
  notes: z.string().optional(),
});

function toDate(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export type ProjectFormState = { error?: string } | undefined;

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: data.name,
      description: data.description || null,
      objective: data.objective || null,
      status: data.status,
      priority: data.priority,
      startDate: toDate(data.startDate),
      targetDate: toDate(data.targetDate),
      responsiblePerson: data.responsiblePerson || null,
      tagsJson: encodeStringList(parseTagsInput(data.tags ?? "")),
      budget: data.budget ? Number(data.budget) : null,
      notes: data.notes || null,
    },
  });

  await logActivity({
    userId: user.id,
    entityType: "Project",
    entityId: project.id,
    action: "project_created",
    summary: `Created project '${project.name}'`,
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  const existing = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!existing) return { error: "Project not found." };

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name: data.name,
      description: data.description || null,
      objective: data.objective || null,
      status: data.status,
      priority: data.priority,
      startDate: toDate(data.startDate),
      targetDate: toDate(data.targetDate),
      responsiblePerson: data.responsiblePerson || null,
      tagsJson: encodeStringList(parseTagsInput(data.tags ?? "")),
      budget: data.budget ? Number(data.budget) : null,
      notes: data.notes || null,
    },
  });

  if (existing.status !== data.status) {
    await logActivity({
      userId: user.id,
      entityType: "Project",
      entityId: projectId,
      action: "project_status_changed",
      summary: `'${existing.name}' status changed: ${existing.status} → ${data.status}`,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

/** Consequential write — the UI must show a confirmation before calling this. */
export async function deleteProject(projectId: string) {
  const user = await requireUser();
  const existing = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!existing) return;

  await prisma.project.delete({ where: { id: projectId } });

  await logActivity({
    userId: user.id,
    entityType: "Project",
    entityId: projectId,
    action: "project_deleted",
    summary: `Deleted project '${existing.name}'`,
  });

  revalidatePath("/projects");
  redirect("/projects");
}
