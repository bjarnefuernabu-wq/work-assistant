import Link from "next/link";
import { CompleteCheckbox } from "@/components/tasks/complete-checkbox";
import { PriorityBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Task } from "@/generated/prisma/client";

export function TaskRow({
  task,
  projectName,
  showProject = false,
}: {
  task: Task;
  projectName?: string | null;
  showProject?: boolean;
}) {
  const completed = task.status === "COMPLETED";
  const overdue = !completed && task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 hover:bg-surface/60">
      <CompleteCheckbox taskId={task.id} completed={completed} />
      <Link
        href={`/tasks/${task.id}`}
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          completed ? "text-subtle line-through" : "text-foreground",
        )}
      >
        {task.title}
      </Link>
      {showProject && projectName && (
        <span className="shrink-0 truncate text-xs text-subtle">{projectName}</span>
      )}
      {task.status === "WAITING" && (
        <span className="shrink-0 rounded border border-critical/30 bg-critical/10 px-1.5 py-0.5 text-[10px] font-medium text-critical">
          WAITING
        </span>
      )}
      {task.plannedDate && (
        <span className="shrink-0 text-[11px] text-muted" title="Planned">
          plan {formatDate(task.plannedDate)}
        </span>
      )}
      {task.dueDate && (
        <span
          className={cn(
            "shrink-0 text-[11px]",
            overdue ? "font-medium text-critical" : "text-muted",
          )}
          title="Due"
        >
          due {formatDate(task.dueDate)}
        </span>
      )}
      <PriorityBadge priority={task.priority} />
    </div>
  );
}
