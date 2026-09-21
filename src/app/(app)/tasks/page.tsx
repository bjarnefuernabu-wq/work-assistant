import Link from "next/link";
import { CheckSquare, Plus } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { TaskRow } from "@/components/tasks/task-row";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { sortByUrgency } from "@/lib/dashboard/scoring";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";
import type { TaskStatus } from "@/generated/prisma/enums";

export default async function TasksPage() {
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
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
          <h1 className="text-lg font-semibold text-foreground">{t("Tasks")}</h1>
          <p className="text-sm text-muted">{t("{n} open", { n: openCount })}</p>
        </div>
        <Link href="/tasks/new">
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" /> {t("New task")}
          </Button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t("No tasks yet")}
          description={t("Capture something you need to do.")}
          action={
            <Link href="/tasks/new" className="mt-2">
              <Button variant="primary" size="sm">
                {t("New task")}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map(
            (g) =>
              g.tasks.length > 0 && (
                <Panel key={g.label} title={`${t(g.label)} (${g.tasks.length})`}>
                  {g.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} projectName={task.project?.name} showProject t={t} locale={locale} />
                  ))}
                </Panel>
              ),
          )}
          {completed.length > 0 && (
            <details>
              <summary className="cursor-pointer px-1 py-1 text-xs text-subtle hover:text-muted">
                {t("{n} completed", { n: completed.length })}
              </summary>
              <Panel className="mt-2">
                {completed.map((task) => (
                  <TaskRow key={task.id} task={task} projectName={task.project?.name} showProject t={t} locale={locale} />
                ))}
              </Panel>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
