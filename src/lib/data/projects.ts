import "server-only";
import { prisma } from "@/lib/db/client";

export function listProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { targetDate: "asc" }],
    include: {
      _count: { select: { tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } } } },
    },
  });
}

export function getProjectDetail(userId: string, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
      milestones: { orderBy: { targetDate: "asc" } },
      contacts: { include: { contact: true } },
      decisions: { orderBy: { date: "desc" } },
      risks: { orderBy: { createdAt: "desc" } },
      waitingItems: { include: { contact: true }, orderBy: { since: "asc" } },
      calendarEvents: { orderBy: { startTime: "asc" } },
      emailThreads: { orderBy: { lastMessageAt: "desc" } },
      projectNotes: { orderBy: { createdAt: "desc" } },
    },
  });
}
