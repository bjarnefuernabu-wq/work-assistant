import "server-only";
import { prisma } from "@/lib/db/client";

export interface SearchResult {
  type: "Project" | "Task" | "Contact" | "Note" | "Decision" | "Email" | "Meeting";
  id: string;
  title: string;
  context: string;
  href: string;
}

export async function searchAll(userId: string, query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [projects, tasks, contacts, notes, decisions, threads, events] = await Promise.all([
    prisma.project.findMany({
      where: { userId, OR: [{ name: { contains: q } }, { description: { contains: q } }, { objective: { contains: q } }] },
      take: 10,
    }),
    prisma.task.findMany({
      where: { userId, OR: [{ title: { contains: q } }, { description: { contains: q } }] },
      include: { project: { select: { name: true } } },
      take: 10,
    }),
    prisma.contact.findMany({
      where: { userId, OR: [{ name: { contains: q } }, { organization: { contains: q } }, { email: { contains: q } }] },
      take: 10,
    }),
    prisma.note.findMany({
      where: { OR: [{ title: { contains: q } }, { content: { contains: q } }], project: { userId } },
      include: { project: { select: { id: true, name: true } } },
      take: 10,
    }),
    prisma.decision.findMany({
      where: { OR: [{ title: { contains: q } }, { description: { contains: q } }], project: { userId } },
      include: { project: { select: { id: true, name: true } } },
      take: 10,
    }),
    prisma.emailThread.findMany({
      where: { userId, OR: [{ subject: { contains: q } }, { snippet: { contains: q } }] },
      take: 10,
    }),
    prisma.calendarEvent.findMany({
      where: { userId, title: { contains: q } },
      take: 10,
    }),
  ]);

  return [
    ...projects.map((p): SearchResult => ({ type: "Project", id: p.id, title: p.name, context: p.objective ?? p.status, href: `/projects/${p.id}` })),
    ...tasks.map((t): SearchResult => ({ type: "Task", id: t.id, title: t.title, context: t.project?.name ?? t.status, href: `/tasks/${t.id}` })),
    ...contacts.map((c): SearchResult => ({ type: "Contact", id: c.id, title: c.name, context: c.organization ?? c.role ?? "", href: `/settings` })),
    ...notes.map((n): SearchResult => ({ type: "Note", id: n.id, title: n.title ?? n.content.slice(0, 60), context: n.project?.name ?? "", href: n.project ? `/projects/${n.project.id}` : "/inbox" })),
    ...decisions.map((d): SearchResult => ({ type: "Decision", id: d.id, title: d.title, context: d.project.name, href: `/projects/${d.project.id}` })),
    ...threads.map((t): SearchResult => ({ type: "Email", id: t.id, title: t.subject, context: t.snippet ?? "", href: `/email/${t.id}` })),
    ...events.map((e): SearchResult => ({ type: "Meeting", id: e.id, title: e.title, context: new Date(e.startTime).toLocaleDateString(), href: "/calendar" })),
  ];
}
