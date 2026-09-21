import Link from "next/link";
import { CheckSquare, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { TaskRow } from "@/components/tasks/task-row";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { sortByUrgency } from "@/lib/dashboard/scoring";
import type { TaskStatus } from "@/generated/prisma/enums";

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "COMPLETED" && t.status !== "CANCELLED");
  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status && !overdue.includes(t));
  const completed = byStatus("COMPLETED");

  const groups: { label: string; tasks: typeof tasks; tone?: string }[] = [
    { label: "Overdue", tasks: sortByUrgency(overdue) },
    { label: "Inbox", tasks: sortByUrgency(byStatus("INBOX")) },
    { label: "In progress", tasks: sortByUrgency(byStatus("IN_PROGRESS")) },
    { label: "Planned", tasks: sortByUrgency(byStatus("PLANNED")) },
    { label: "Waiting", tasks: sortByUrgency(byStatus("WAITING")) },
  ];

  const openCount = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length;

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-muted">{openCount} open</p>
        </div>
        <Link href="/tasks/new">
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" /> New task
          </Button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Capture something you need to do."
          action={
            <Link href="/tasks/new" className="mt-2">
              <Button variant="primary" size="sm">
                New task
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map(
            (g) =>
              g.tasks.length > 0 && (
                <Panel key={g.label} title={`${g.label} (${g.tasks.length})`}>
                  {g.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} projectName={t.project?.name} showProject />
                  ))}
                </Panel>
              ),
          )}
          {completed.length > 0 && (
            <details>
              <summary className="cursor-pointer px-1 py-1 text-xs text-subtle hover:text-muted">
                {completed.length} completed
              </summary>
              <Panel className="mt-2">
                {completed.map((t) => (
                  <TaskRow key={t.id} task={t} projectName={t.project?.name} showProject />
                ))}
              </Panel>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
